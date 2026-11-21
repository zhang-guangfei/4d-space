"""Exercise the first chapter's map and real eight-cell challenge in Chromium."""
import argparse
import importlib.util
import json
from pathlib import Path
import shutil

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("webgl_acceptance", HERE / "codex-e2e.py")
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)

# Read the transported frame from the in-game HUD. In each room the camera's local
# coordinates range from -3 to +3. No code in this test writes to the camera,
# engine clock, player state, route state, or collision system.
def door_vector(page, cell):
    anchor = page.locator("#anchor").inner_text().split()
    axes = anchor[1::2]
    for axis, name in enumerate(axes):
        if name[0] == cell[0]:
            return [((1 if name == cell else -1) if k == axis else 0) for k in range(3)]
    raise AssertionError(f"{cell} has no door in this frame: {axes}")


def steering(page, points, crossing=None):
    # A test pilot samples the rendered pose and presses/releases the six normal
    # digital thrusters. It slows before changing direction and clears every held
    # key on success or timeout. Each segment observes actual physics and seams.
    return page.evaluate("""({points,crossing})=>new Promise((resolve,reject)=>{
      const scene=BABYLON.Engine.Instances.find(e=>e.getRenderingCanvas().id==='world').scenes[0];
      const camera=scene.activeCamera, canvas=document.querySelector('#world');
      const held=new Set(), before=performance.now(), targetCell=document.querySelector('#cell');
      const axes=[BABYLON.Axis.X,BABYLON.Axis.Y,BABYLON.Axis.Z];
      const keys=[['KeyA','KeyD'],['ControlLeft','Space'],['KeyS','KeyW']];
      const setKey=(code,down)=>{
        if(held.has(code)===down)return;
        canvas.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{bubbles:true,cancelable:true,code}));
        if(down)held.add(code);else held.delete(code);
      };
      let observer,last=camera.position.asArray(),lastCell=targetCell.textContent;
      function finish(error){
        scene.onAfterRenderObservable.remove(observer);
        for(const code of [...held])setKey(code,false);
        if(error)reject(new Error(error));else resolve(camera.position.asArray());
      }
      observer=scene.onAfterRenderObservable.add(()=>{
        const p=camera.position.asArray(),cell=targetCell.textContent,dt=Math.max(.001,Math.min(.05,scene.getEngine().getDeltaTime()/1000));
        if(document.querySelector('#ending:not(.hidden)')){finish();return}
        if(performance.now()-before>35000){
          const reason={room:cell,position:p,target:points[0],held:[...held],pointer:document.pointerLockElement?.id,
            active:document.activeElement?.id,stats:document.querySelector('#stats').textContent,
            diagnostics:document.querySelector('#lookdiag').textContent,heading:camera.rotationQuaternion?.asArray()};
          finish('Flight timed out: '+JSON.stringify(reason));return;
        }
        if(crossing && cell===crossing){finish();return}
        const velocity=p.map((v,i)=>cell===lastCell?(v-last[i])/dt:0);
        last=p;lastCell=cell;
        const delta=points[0].map((v,i)=>v-p[i]);
        if(!crossing && Math.max(...delta.map(Math.abs))<.14 && Math.hypot(...velocity)<.8){
          points.shift();if(!points.length){finish();return}
        }
        setKey('ShiftLeft',true);
        for(let k=0;k<3;k++){
          const basis=camera.getDirection(axes[k]).asArray();
          const project=v=>v.reduce((n,x,i)=>n+x*basis[i],0);
          const e=project(delta),speed=project(velocity);
          const targetSpeed=Math.sign(e)*Math.min(3.2,2.5*Math.abs(e),Math.sqrt(5*Math.abs(e)));
          const command=targetSpeed-speed;
          setKey(keys[k][0],command<-.12); setKey(keys[k][1],command>.12);
        }
      });
    })""", {"points": points, "crossing": crossing})


def fly(page, destination):
    current = page.locator("#cell").inner_text()
    direction = door_vector(page, destination)
    p = qa.player_position(page)
    points = []
    if current.startswith("Y"):
        entry_axis = max(range(3), key=lambda i: abs(p[i]))
        entry = [0, 0, 0]
        entry[entry_axis] = 1 if p[entry_axis] > 0 else -1
        if direction != entry:
            # Cut round the sculpture via a corner of the room. These are real
            # waypoints outside its collision volume, not a mode which ignores it.
            axis = next(i for i in range(3) if not direction[i] and not entry[i])
            side = direction if direction[entry_axis] == 0 else [int(i == axis) for i in range(3)]
            points.append([1.7*(a+b) for a,b in zip(entry,side)])
            if side != direction:
                points.append([1.7*(a+b) for a,b in zip(direction,side)])
    points.append([2*v for v in direction])
    steering(page, points)
    steering(page, [[5*v for v in direction]], crossing=destination)
    steering(page, [[-1.8*v for v in direction]])
    assert page.locator("#cell").inner_text() == destination


def upper_loop(page):
    # The three upper exhibitions are placed around one straight X/W circuit.
    for room in ["X+", "W-", "X-", "W+"]:
        qa.key_until(page, "w", f"document.querySelector('#cell').textContent==='{room}'")
        qa.key_until(page, "w", "BABYLON.Engine.Instances[0].scenes[0].activeCamera.position.z>-.9")
        page.keyboard.press("f")
        page.locator("#console:not(.hidden)").wait_for()
        print("Read model",room,flush=True)
        page.wait_for_timeout(1500)
        if room == "W+":
            page.locator("#unlock:enabled").click()
            page.wait_for_selector('#world[data-ready=true]')
            assert not page.locator('#menu').is_visible()
            assert page.locator('#fieldBackground').inner_text().strip()
            qa.set_pointer_with_t(page,True)
        else:
            page.locator("#closeLab").click()
        try:
            page.wait_for_function("document.pointerLockElement?.id==='world'",timeout=7500)
        except Exception:
            print("After returning from",room,page.evaluate("""()=>({
              menu:document.querySelector('#menu').className,lab:document.querySelector('#console').className,
              notice:document.querySelector('#notice').textContent,stats:document.querySelector('#stats').textContent,
              focus:document.activeElement.id,events:audit.controlEvents,
              activeEngines:BABYLON.Engine.Instances.map(e=>e.getRenderingCanvas()?.id)})"""),flush=True)
            raise
        page.locator("#world").focus()


def wait_locked(page):
    page.wait_for_function("""()=>document.pointerLockElement?.id==='world' &&
      document.querySelector('#stats').textContent.includes('鼠标锁定') &&
      document.querySelector('#menu').classList.contains('hidden')""",timeout=9000)
    page.locator("#world").focus()


def report_controls(page):
    print("Control diagnostics",page.evaluate("""()=>({
      pointer:document.pointerLockElement?.id,focus:document.activeElement?.id,menu:document.querySelector('#menu').className,
      lab:document.querySelector('#console').className,hint:document.querySelector('#hint').textContent,
      notice:document.querySelector('#notice').textContent,stats:document.querySelector('#stats').textContent,
      map:document.querySelector('#routeMap')?.dataset.status,events:audit.controlEvents?.slice(-30)
    })"""),flush=True)

def map_state(page):
    return page.evaluate("""()=>{
      const map=document.querySelector('#routeMap');
      const cells=[...map.querySelectorAll('g[data-cell]')];
      return {state:map.dataset.status,room:document.querySelector('#cell').textContent,
        current:cells.filter(n=>n.dataset.current==='true').map(n=>n.dataset.cell),
        visited:cells.filter(n=>n.dataset.visited==='true').map(n=>n.dataset.cell),
        cells:cells.map(n=>n.dataset.cell), directed:[...map.querySelectorAll('#mapSolution path[data-from][data-to]')].map(n=>[n.dataset.from,n.dataset.to]),
        hint:document.querySelector('#routeHint').getAttribute('aria-pressed')};
    }""")


def rects(page):
    return page.evaluate("""()=>{
      const sels=['header','#hud','#compass','#routeMap','#routeHint','footer'];
      return Object.fromEntries(sels.map(s=>{
        const r=document.querySelector(s).getBoundingClientRect();
        return [s,[r.left,r.top,r.right,r.bottom].map(x=>Math.round(x*10)/10)];
      }));
    }""")


def check_layout(page):
    results = {}
    for w, h in qa.VIEWPORTS:
        page.set_viewport_size({"width":w, "height":h})
        panels = rects(page)
        top, left, compass, chart, button, footer = panels.values()
        for panel in panels.values():
            assert -.5 <= panel[0] < panel[2] <= w+.5 and -.5 <= panel[1] < panel[3] <= h+.5, (w,h,panel)
        assert left[2] <= chart[0] and top[3] <= min(left[1],compass[1]), (w,h,panels)
        # Some layouts nest the chart inside the same right-hand instrument.
        assert page.locator('#explored').bounding_box()['y'] < chart[1], (w,h,panels)
        assert chart[3] <= footer[1]+.5 and chart[1] <= button[1] < button[3] <= chart[3], (w,h,panels)
        results[f"{w}×{h}"] = panels
    page.set_viewport_size({"width":1280, "height":720})
    return results


def challenge(browser, url, out):
    page, errors, requests = qa.new_page(browser,url)
    page.evaluate("""()=>{
      audit.controlEvents=[];
      for(const name of ['click','pointerlockchange','pointerlockerror','focusin','focusout','keydown']){
        document.addEventListener(name,e=>{if(e.type==='keydown'&&!['KeyT','KeyH','KeyF'].includes(e.code))return;
          audit.controlEvents.push([e.type,e.target?.id,document.pointerLockElement?.id,e.code])},true);
      }
    }""")
    measurements = qa.enter(page,"#menu")
    assert not page.locator("#routeMap").is_visible()
    qa.set_pointer_with_t(page,True)
    wait_locked(page)
    qa.aim_at_yaw(page,0)
    upper_loop(page)
    page.locator("#routeMap").wait_for(state="visible")
    assert "测试模式" not in page.locator("#phaseTitle").inner_text()
    first=map_state(page)
    phase_text=lambda: {"background":page.locator('#fieldBackground').inner_text().strip(),
                        "objective":page.locator('#objective').inner_text().strip()}
    measurements["surveyBriefing"]=phase_text()
    assert measurements["surveyBriefing"]["background"] and measurements["surveyBriefing"]["objective"]
    assert first["state"]=="survey" and len(first["cells"])==8 and first["current"]==["W+"],first
    tour=["X+","W-","X-","Y+","Z+","Y-","Z-","W+"]
    for lap in range(3):
        for room in tour:
            fly(page,room)
        print("Survey lap",lap+1,page.locator("#modelsProgress").inner_text(),flush=True)
    print("Opening route control",flush=True)
    assert "24/24" in page.locator("#modelsProgress").inner_text()
    measurements["challengeAvailable"]=phase_text()
    page.keyboard.press("r")
    page.wait_for_function("document.querySelector('#routeMap').dataset.status==='active'")
    measurements["challengeBriefing"]=phase_text()
    assert measurements["challengeBriefing"]["objective"] != measurements["surveyBriefing"]["objective"]
    try:
        wait_locked(page)
        page.keyboard.press("t")
        page.wait_for_function("!document.pointerLockElement && document.querySelector('#menu').classList.contains('hidden')",timeout=6000)
    except Exception:
        report_controls(page)
        raise
    print("Pointer released; clicking map hint",flush=True)
    page.locator("#routeHint").click()
    page.keyboard.press("h")
    page.wait_for_function("document.querySelector('#routeHint').getAttribute('aria-pressed')==='false'")
    page.keyboard.press("h")
    hint=map_state(page)
    assert hint["state"]=="active" and hint["hint"]=="true",hint
    edges=hint["directed"]
    assert len(edges)==7 and all(a[0]!=b[0] for a,b in edges),edges
    solution=[edges[0][0]]+[b for a,b in edges]
    assert solution[0]=="W+" and len(set(solution))==8 and all(a==b[0] for a,b in zip(solution,edges)),edges
    print("Checking map layout",flush=True)
    measurements["layout"]=check_layout(page)
    qa.screenshot(page,out,"route-start")
    page.keyboard.press("t")
    wait_locked(page)
    page.keyboard.press("h")
    page.wait_for_function("document.querySelector('#routeHint').getAttribute('aria-pressed')==='false'")
    page.keyboard.press("h")
    position=qa.player_position(page)
    page.keyboard.down("w")
    try:
        page.wait_for_function("""p=>BABYLON.Engine.Instances[0].scenes[0].activeCamera.position
              .subtract(BABYLON.Vector3.FromArray(p)).length()>.06""",arg=position,timeout=9000)
    except Exception:
        report_controls(page)
        raise
    finally:
        page.keyboard.up("w")
    history=[map_state(page)]
    print("Following map solution",solution,flush=True)
    for i,room in enumerate(solution[1:],1):
        fly(page,room)
        page.wait_for_function("(room)=>document.querySelector('#route').textContent.includes(room)", arg=room)
        state=map_state(page)
        assert state["current"]==[room] and set(state["visited"])==set(solution[:i+1]),state
        history.append(state)
        if i==3:
            qa.screenshot(page,out,"route-in-progress")
    assert history[-1]["state"]=="complete",history[-1]
    assert page.locator("#route").inner_text().splitlines()[-1].split(" → ")==solution
    qa.screenshot(page,out,"route-complete")
    # After the eighth cell, the game asks for a separate return to the mirror.
    if solution[-1]=="W-":
        fly(page,"X+")
    fly(page,"W+")
    if not page.locator("#ending").is_visible():
        y,z=door_vector(page,"Y+"),door_vector(page,"Z+")
        steering(page,[[1.55*a-.1*b for a,b in zip(y,z)]])
    page.locator("#ending").wait_for(state="visible")
    assert page.locator("#ending a[href*=chapter2]").is_visible()
    measurements.update(initial=first,proposedRoute=solution,trail=history,returnToMirror=True,
                        errors=errors,requests=len(requests))
    assert not errors,errors
    page.close()
    return measurements


def aim_pitch(page, angle):
    page.evaluate("""angle=>{
      const scene=BABYLON.Engine.Instances.find(e=>e.getRenderingCanvas().id==='world').scenes[0];
      const dx=0, dy=(angle-scene.activeCamera.rotation.x)/.002, target=document.querySelector('#world');
      const steps=Math.ceil(Math.abs(dy)/180)||1;
      target.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,movementX:0,movementY:0}));
      for(let i=0;i<steps;i++)target.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,movementX:dx,movementY:Math.round(dy/steps)}));
    }""",angle)
    page.wait_for_function("a=>Math.abs(BABYLON.Engine.Instances[0].scenes[0].activeCamera.rotation.x-a)<.02",arg=angle)


def portraits(browser,url,out):
    page, errors, requests=qa.new_page(browser,url)
    page.set_viewport_size({"width":1440,"height":900})
    qa.enter(page,"#menu")
    page.keyboard.press("Escape")
    page.locator("#menu:not(.hidden) details > summary").first.click()
    page.locator("#resolution").select_option("native")
    page.locator("#start").click()
    qa.set_pointer_with_t(page,True)
    page.wait_for_function("document.pointerLockElement?.id==='world'")
    qa.aim_at_yaw(page,0)
    aim_pitch(page,1.535)
    page.evaluate("""()=>new Promise(r=>{let n=0;function frame(){if(++n===30)r();else requestAnimationFrame(frame)}frame()})""")
    page.mouse.down()
    page.mouse.up()
    page.wait_for_function("""()=>BABYLON.Engine.Instances[0].scenes[0].transformNodes
        .some(n=>n.name==='leftArm joint' && n.rotation.x < -1)""",timeout=12000)
    qa.screenshot(page,out,"crew-first-person")
    def meshes():
        return page.evaluate("""()=>{
          const scene=BABYLON.Engine.Instances[0].scenes[0];
          const active=scene.getActiveMeshes();
          const names=Array.from({length:active.length},(_,i)=>active.data[i]).filter(m=>m.isEnabled());
          return {local:names.filter(m=>m.metadata?.asset==='station-crew-suit').map(m=>m.name),
            remote:names.filter(m=>m.name.startsWith('astronaut distant')).map(m=>m.name),
            remoteDetail:[...new Set(names.filter(m=>m.name.startsWith('astronaut distant')).map(m=>m.metadata?.detail))],
            internal:[scene.getEngine().getRenderWidth(),scene.getEngine().getRenderHeight()]};
        }""")
    local=meshes()
    assert local['local'],local
    aim_pitch(page,.027)
    page.keyboard.press("Tab")
    page.wait_for_function("BABYLON.Engine.Instances[0].scenes[0].activeCamera.fov < .4")
    qa.screenshot(page,out,"crew-optical-return")
    remote=meshes()
    assert remote['remote'] and 'full' in remote['remoteDetail'],remote
    assert not errors,errors
    page.close()
    return {"local":local,"opticalReturn":remote,"errors":errors,"requests":len(requests)}

def profile(browser,url,out):
    page,errors,requests=qa.new_page(browser,url)
    measurements=qa.enter(page,"#menu")
    page.evaluate("""()=>{
      const engine=BABYLON.Engine.Instances[0], scene=engine.scenes[0];
      audit.widths=[];
      scene.onAfterRenderObservable.add(()=>{
        const size=engine.getRenderWidth()+'×'+engine.getRenderHeight();
        if(audit.widths.at(-1)!==size)audit.widths.push(size);
      });
    }""")
    qa.sample(page,7)
    measurements["warmupBuffers"]=page.evaluate("audit.widths.splice(0)")
    measurements["steady"]=qa.sample(page,5)
    measurements["steadyBuffers"]=page.evaluate("audit.widths.splice(0)")
    qa.screenshot(page,out,"profile-idle")
    qa.measure_walking(page,measurements)
    measurements["walkingBuffers"]=page.evaluate("audit.widths.splice(0)")
    qa.screenshot(page,out,"profile-walk-end")
    # Take the explicit quality measurements at the same entry camera as idle.
    # Reloading creates a fresh game, then the user-facing setting fixes the buffer.
    for mode in ["native","high"]:
        page.goto(url, wait_until="domcontentloaded")
        qa.enter(page,"#menu")
        page.keyboard.press("Escape")
        page.locator("#menu:not(.hidden) details > summary").first.click()
        page.locator("#resolution").select_option(mode)
        page.locator("#start").click()
        page.locator("#menu").wait_for(state="hidden")
        qa.sample(page,2)
        measurements[mode]=qa.sample(page,3)
    measurements.update(errors=errors,requests=len(requests))
    assert not errors, errors
    page.close()
    return measurements

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url")
    parser.add_argument("--mode",choices=["challenge","portraits","profile"],default="challenge")
    parser.add_argument("--chromium",default=shutil.which("chromium") or shutil.which("google-chrome"))
    parser.add_argument("--output",type=Path,default=qa.ROOT/"test-results/codex-route")
    renderer=parser.add_mutually_exclusive_group()
    renderer.add_argument("--swiftshader",action="store_true")
    renderer.add_argument("--mesa-gl",action="store_true",help="Use the system OpenGL driver through ANGLE on the current X display")
    args=parser.parse_args()
    args.output.mkdir(exist_ok=True,parents=True)
    flags=["--disable-dev-shm-usage"]
    if args.swiftshader:flags+=["--use-angle=swiftshader","--enable-unsafe-swiftshader"]
    if args.mesa_gl:flags+=["--use-gl=angle","--use-angle=gl","--ignore-gpu-blocklist"]
    with qa.site(args.url) as url, sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.chromium,headless=not args.mesa_gl,args=flags)
        run={"challenge":challenge,"portraits":portraits,"profile":profile}[args.mode]
        report={"browser":browser.version,"chapter1":run(browser,url,args.output)}
        (args.output/(args.mode+".json")).write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        browser.close()

if __name__=="__main__":
    main()
