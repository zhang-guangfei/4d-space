"""Real Chromium/WebGL acceptance run. See docs/codex-playtest.md."""
import argparse
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
from statistics import median
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "apps/fps-demo/dist"
PREFIX = "/4d-space/codex/"
VIEWPORTS = [(1280, 720), (1280, 800), (1440, 900), (1920, 1080)]

class NestedSite(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not urlsplit(self.path).path.startswith(PREFIX):
            self.send_error(404)
            return
        self.path = "/" + self.path[len(PREFIX):]
        super().do_GET()

    def log_message(self, format, *args):
        pass

@contextmanager
def site(url):
    if url:
        yield url.rstrip("/") + "/"
        return
    handler = partial(NestedSite, directory=str(DIST))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}{PREFIX}"
        finally:
            server.shutdown()
            thread.join()

INIT = """
window.audit = {tasks:[],inputs:0};
new PerformanceObserver(l => {
    for(const e of l.getEntries()) audit.tasks.push({start:e.startTime, ms:e.duration});
}).observe({type:'longtask',buffered:true});
for(const event of ['keydown','pointerdown','click']) {
    document.addEventListener(event, ev => { if(ev.isTrusted) audit.inputs++; }, true);
}
"""

def new_page(browser, url):
    page = browser.new_page(viewport={"width":1280,"height":720}, locale="zh-CN")
    page.set_default_timeout(60_000)
    page.add_init_script(INIT)
    messages, requests = [], []
    def record_error(message):
        messages.append(message)
        print("  browser:", message, flush=True)
    page.on("pageerror", lambda err: record_error("exception: " + str(err)))
    page.on("console", lambda msg: record_error(msg.type + ": " + msg.text)
            if msg.type == "error" or "AudioContext was not allowed" in msg.text else None)
    page.on("requestfailed", lambda req: record_error(f"{req.failure}: {req.url}"))
    page.on("response", lambda response:
            record_error(f"HTTP {response.status}: {response.url}")
            if response.status >= 400 else requests.append(response.url))
    page.goto(url, wait_until="domcontentloaded", timeout=180_000)
    return page, messages, requests

def enter(page, gate):
    first = gate == "#menu"
    ready = "#world[data-ready=true]" if first else "body[data-mode=playing]"
    context = "#fieldBackground" if first else "#section-context"
    page.locator(ready).wait_for(state="attached", timeout=180_000)
    page.wait_for_function("""sel => {
        const visibleText = el => el && el.getClientRects().length && el.textContent.trim().length > 1;
        return visibleText(document.querySelector(sel)) && visibleText(document.querySelector('#objective'));
    }""", arg=context)
    assert not page.locator(gate).is_visible()
    readable = page.evaluate("performance.now()")
    # Wait for a frame actually drawn by the chapter's WebGL scene. No click,
    # key press or synthetic pointer activation is used to dismiss an overlay.
    frame = page.evaluate("""() => new Promise(resolve=>{
        const engine=BABYLON.Engine.Instances.find(e=>e.getRenderingCanvas()?.id==='world');
        const scene=engine.scenes[0];
        scene.onAfterRenderObservable.addOnce(()=>resolve({
            timestamp:performance.now(), activeMeshes:scene.getActiveMeshes().length
        }));
    })""")
    assert frame["activeMeshes"] > 0 and page.evaluate("audit.inputs") == 0
    return {"readyMs":round(readable), "confirmedRenderMs":round(frame["timestamp"]),
            "inputsBeforeReady":0, "background":page.locator(context).inner_text(),
            "objective":page.locator("#objective").inner_text()}


def verify_immediate_walk(page):
    start = player_position(page)
    page.keyboard.down("w")
    try:
        page.wait_for_function("""p=>BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.position
            .subtract(BABYLON.Vector3.FromArray(p)).length() > .15""", arg=start)
    finally:
        page.keyboard.up("w")
    after = player_position(page)
    page.keyboard.down("s")
    try:
        page.wait_for_function("""p=>BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.position
            .subtract(BABYLON.Vector3.FromArray(p)).length() < .13""", arg=start)
    finally:
        page.keyboard.up("s")
    return {"start":start, "forward":after}


def sample(page, seconds=3):
    result = page.evaluate("""seconds => new Promise(resolve=>{
        const engine=BABYLON.Engine.LastCreatedEngine, scene=engine.scenes[0];
        const intervals=[];
        let start=0,last=0;
        const observer=scene.onAfterRenderObservable.add(()=>{
            const t=performance.now();
            if(!start){start=t;last=t;return}
            intervals.push(t-last);last=t;
            if(t-start < seconds*1000 || intervals.length < 4) return;
            scene.onAfterRenderObservable.remove(observer);
            resolve({intervals,totalMs:t-start,renderWidth:engine.getRenderWidth(),
                renderHeight:engine.getRenderHeight(),renderer:engine.getGlInfo().renderer,
                webgl:engine.getGlInfo().version,meshes:scene.meshes.length,
                activeMeshes:scene.getActiveMeshes().length,activeIndices:scene.getActiveIndices(),
                });
        });
    })""", seconds)
    intervals = sorted(result.pop("intervals"))
    result.update(frames=len(intervals),fps=round(1000*len(intervals)/result["totalMs"],2),
                  medianFrameMs=round(median(intervals),1),
                  p95FrameMs=round(intervals[(95*len(intervals)+99)//100-1],1))
    result["totalMs"] = round(result["totalMs"])
    return result

def screenshot(page, output, name):
    page.screenshot(path=str(output / (name + ".jpg")), type="jpeg", quality=90, timeout=120_000)

def key_until(page, key, condition, timeout=45_000):
    page.keyboard.down(key)
    try:
        page.wait_for_function(condition, timeout=timeout, polling="raf")
    except Exception:
        print("Movement check:",key,condition,page.evaluate("""()=>{const c=BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera;return [c.position.asArray(),c.rotation.asArray(),document.pointerLockElement?.id,document.activeElement?.id]}"""),flush=True)
        raise
    finally:
        page.keyboard.up(key)

def player_position(page):
    return page.evaluate("BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.position.asArray()")

def aim_at_yaw(page, target):
    # Feed pointer deltas relative to the real camera. A viewport resize can
    # deliver one platform warp packet, so do not assume a starting heading.
    for _ in range(4):
        difference=page.evaluate("""target=>{
            const cam=BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera;
            const angle=Math.atan2(Math.sin(target-cam.rotation.y),Math.cos(target-cam.rotation.y));
            const dx=angle/.002, steps=Math.max(1,Math.ceil(Math.abs(dx)/220));
            const canvas=document.querySelector('#world');
            canvas.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,movementX:0}));
            for(let i=0;i<steps;i++)canvas.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,movementX:Math.round(dx/steps)}));
            return Math.abs(angle)
        }""",target)
        if difference < .02:
            return
        page.evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
    raise AssertionError("could not orient camera with pointer input")

def measure_walking(page, metrics):
    page.evaluate("""()=>{
        const cell=document.querySelector('#cell'); audit.trail=[cell.textContent];
        new MutationObserver(()=>{if(audit.trail.at(-1)!==cell.textContent)audit.trail.push(cell.textContent)})
            .observe(cell,{childList:true,subtree:true,characterData:true});
    }""")
    page.locator("#world").focus()
    page.keyboard.down("Shift")
    page.keyboard.down("w")
    try:
        metrics["walking"]=sample(page, 5)
    finally:
        page.keyboard.up("w")
        page.keyboard.up("Shift")
    if page.evaluate("audit.trail.length")==1:
        key_until(page,"w","document.querySelector('#cell').textContent !== 'W+'")
    metrics["walkEndCell"]=page.locator("#cell").inner_text()
    metrics["walkTrail"]=page.evaluate("audit.trail")

def profile_corridor(browser,url,output):
    page,errors,requests=new_page(browser,url)
    metrics=enter(page,"#menu")
    metrics["render"]=sample(page,5)
    screenshot(page,output,"corridor-default")
    measure_walking(page,metrics)
    metrics.update(requests=len(requests),errors=errors,longTasks=page.evaluate("audit.tasks"))
    page.close()
    return metrics

def profile_chapters(browser, url):
    report = {"viewport": {"width":1280,"height":720}, "quality":"automatic",
              "warmupMs":5000, "sampleSeconds":5}
    page, errors, _ = new_page(browser, url)
    corridor = {"entry":enter(page, "#menu")}
    page.wait_for_timeout(report["warmupMs"])
    corridor["idle"] = sample(page, report["sampleSeconds"])
    measure_walking(page, corridor)
    corridor["errors"] = errors
    page.close()
    assert not errors, errors
    report["chapter1"] = corridor

    page, errors, _ = new_page(browser, url + "chapter2/")
    folded = {"entry": enter(page, "#gate"), "sections":{}}
    for index in (0,5,9):
        if index:
            page.locator("#chapter-select").select_option(str(index))
        page.wait_for_timeout(report["warmupMs"])
        title = page.locator("#mission-title").inner_text()
        folded["sections"][title] = sample(page, report["sampleSeconds"])
    folded["errors"] = errors
    page.close()
    assert not errors, errors
    report["chapter2"] = folded
    return report

def run_one(browser, url, output):
    page, errors, requests = new_page(browser, url)
    metrics = enter(page, "#menu")
    metrics["immediateMovement"] = verify_immediate_walk(page)
    set_pointer_with_t(page, True)
    metrics["render"] = sample(page, 5)
    print("  steady", metrics["render"]["fps"], "FPS", flush=True)
    metrics["compassLayout"]={}
    metrics["textLayout"]={}
    assert page.locator("#compass .door").count()==6
    for width,height in VIEWPORTS:
        page.set_viewport_size({"width":width,"height":height})
        panels=page.evaluate("""()=>Object.fromEntries(['header','#hud','#compass'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,[r.left,r.top,r.right,r.bottom]]}))""")
        h,hud,compass=(panels[k] for k in ["header","#hud","#compass"])
        assert 0 <= hud[0] < hud[2] <= compass[0] < compass[2] <= width+.5
        assert h[3] <= min(hud[1],compass[1]) and max(hud[3],compass[3]) <=height+.5
        metrics["compassLayout"][f"{width}×{height}"]=panels
        typography = layout(page)
        assert not typography["issues"], (width,height,typography["issues"])
        metrics["textLayout"][f"{width}×{height}"]=typography
    page.set_viewport_size({"width":1280,"height":720})
    screenshot(page, output, "01-corridor")
    # Use the normal walk and look handlers. No chamber override or camera teleport.
    aim_at_yaw(page,0)
    key_until(page, "w", "BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.position.z > -.08")
    key_until(page, "a", "BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.position.x < -2.32")
    page.locator("#pause").focus()
    page.locator("#pause").press("Enter")
    if not page.locator("#resolution").is_visible():
        page.locator("#menu details").first.locator("summary").first.click()
    page.locator("#resolution").select_option("native")
    page.set_viewport_size({"width":1440,"height":900})
    page.locator("#start").click()
    page.wait_for_timeout(300)
    def photography_state():
        return page.evaluate("""()=>{const e=BABYLON.Engine.LastCreatedEngine;return {
          locked:document.pointerLockElement?.id || null,width:e.getRenderWidth(),menu:document.querySelector('#menu').className,
          notice:document.querySelector('#notice').textContent,quality:document.querySelector('#resolution').value
        }}""")
    state=photography_state()
    if not state["locked"]:
        # Exercise the advertised click-to-capture path after a rapid resume.
        page.wait_for_timeout(1250)
        if page.locator("#menu").is_visible():
            page.locator("#start").click()
        else:
            page.locator("#world").click(position={"x":650,"y":440})
    page.wait_for_function("document.querySelector('#menu').classList.contains('hidden') && BABYLON.Engine.LastCreatedEngine.getRenderWidth() >= 1440")
    metrics["galleryMouseMode"]="captured" if photography_state()["locked"] else "free mouse"
    aim_at_yaw(page,-1.57)
    metrics["photoRenderWidth"]=page.evaluate("BABYLON.Engine.LastCreatedEngine.getRenderWidth()")
    screenshot(page, output, "02-venus-window")
    page.keyboard.press("Tab")
    page.wait_for_function("BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.fov < .4")
    screenshot(page, output, "03-venus-detail")
    metrics["nativeZoom"]=sample(page)
    page.keyboard.press("Tab")
    metrics.update(camera=player_position(page),requests=len(requests),
                   longTasks=page.evaluate("audit.tasks"),errors=errors)
    page.close()
    page, movement_errors, _ = new_page(browser,url)
    enter(page,"#menu")
    measure_walking(page,metrics)
    metrics["errors"].extend(movement_errors)
    page.close()
    return metrics

# Each row targets an actual first-person fixture, then operates the right-hand
# console and presses F. Only the camera is observed, never directly changed.
ROUTE = [
    ("回声褶面", [(0,-2.6, ["w+"])]),
    ("无缝之壁", [(0,4.5, ["transit"])]),
    ("折页天桥", [(0,4.7, ["turn+","turn+"])]),
    ("潮汐球", [(0,1.9, []), (0,1.9, ["w+"]), (0,1.9, ["w+"])]),
    ("八面体雪线", [(0,1.9, ["w+"]), (0,1.9, ["w+"])]),
    ("四维货栈", [(0,1.9, ["cargo"])]),
    ("反手钥匙", [(0,1.9, ["turn+"]*4)]),
    ("双环结", [(-2,1.9, []), (2.8,1.9, ["w+"]), (2.8,1.9, ["w-"])]),
    ("第二脉搏", [(0,1.9, ["turn+","w+","w+"]), (0,1.9, ["w-"])]),
    ("空白回执", [(0,1.9, ["w+"]*3), (0,-2.6, ["w-"]*3)]),
]

def walk_to(page, x, z):
    page.locator("#world").focus()
    for name, index, dest, negative, positive in [("x",0,x,"a","d"),("z",2,z,"s","w")]:
        diff = dest - player_position(page)[index]
        if abs(diff) < .4:
            continue
        sign = 1 if diff > 0 else -1
        key_until(page, positive if sign > 0 else negative,
                  f"(BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.position.{name}-({dest}))*({sign}) >= -.35")

def operate(page, action, axis=None, delta=None):
    selector = f'[data-action="{action}"]'
    if axis:
        selector += f'[data-axis="{axis}"][data-delta="{delta}"]'
    button = page.locator(selector).first
    assert button.is_enabled(), selector
    # Keyboard activation also works while the pointer is captured by the scene.
    button.focus()
    button.press("Enter")

def solve_cargo(page, output):
    operate(page, "move", "x", 1)
    operate(page, "undo")
    operate(page, "move", "x", 1)
    operate(page, "reset")
    operate(page, "basis")
    assert "两个 Z 甲板" in page.locator("#scope").get_attribute("aria-label")
    for axis, delta in [("x",1),("w",1),("w",1),("z",1),("y",-1),("w",1),("z",-1),("y",1)]:
        operate(page, "move", axis, delta)
    screenshot(page, output, "07-cargo-xyw")

def layout(page):
    return page.evaluate("""() => {
        const issues=[], words=[], walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
        let n;
        while(n=walk.nextNode()){
            const el=n.parentElement, text=n.textContent.trim();
            if(!text || el.closest('script,style,option,.sr,[aria-hidden=true]'))continue;
            const r=document.createRange();r.selectNodeContents(n);
            for(const b of r.getClientRects()){
                if(!b.width || !b.height)continue;
                if(b.left < -1 || b.right > innerWidth+1 || b.top < -1 || b.bottom > innerHeight+1){
                    issues.push('outside: '+text);continue;
                }
                for(const o of words){
                    if(el===o.el || el.contains(o.el) || o.el.contains(el))continue;
                    const overlapX=Math.min(o.b.right,b.right)-Math.max(o.b.left,b.left);
                    const overlapY=Math.min(o.b.bottom,b.bottom)-Math.max(o.b.top,b.top);
                    if(overlapX>2 && overlapY>4)issues.push(o.text+' / '+text);
                }
                words.push({el,text,b});
            }
        }
        const controls=Array.from(document.querySelectorAll('button,select,header a,nav a')).map(el=>[el,el.getBoundingClientRect()]).filter(([,r])=>r.width && r.height);
        for(let i=0;i<controls.length;i++)for(let j=0;j<i;j++){
            const [a,r]=controls[i],[b,q]=controls[j];
            if(Math.min(q.right,r.right)-Math.max(q.left,r.left)>1 && Math.min(q.bottom,r.bottom)-Math.max(q.top,r.top)>1) issues.push('buttons: '+(a.id||a.textContent)+' / '+(b.id||b.textContent));
        }
        const bridge=document.querySelector('#bridge');
        if(bridge){
            if(/舱层|楼层|上楼|下楼/.test(bridge.innerText)) issues.push("floor terminology");
            const canvas=document.querySelector('#world').getBoundingClientRect(), side=document.querySelector('.console').getBoundingClientRect();
            if(canvas.right > side.left + 1) issues.push('world and console overlap');
        }
        return {textRuns:words.length,controls:controls.length,issues:[...new Set(issues)]};
    }""")

def all_layouts(page):
    results={}
    for width,height in VIEWPORTS:
        page.set_viewport_size({"width":width,"height":height})
        page.evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
        results[f"{width}×{height}"]=layout(page)
    page.set_viewport_size({"width":1280,"height":720})
    return results

def wait_for_slice(page):
    # The 280 ms scan is retired by a rendered frame. A wall-clock timeout
    # can expire before that frame arrives on a busy software rasterizer.
    page.wait_for_function("""() => {
        const scene=BABYLON.Engine.LastCreatedEngine.scenes[0];
        return scene.getTransformNodeByName('transverse W phase gauge')?.isEnabled() === false;
    }""")

def photograph_sphere(page, output):
    walk_to(page,0,-2.6)
    page.evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
    pose=player_position(page)
    radius_script="BABYLON.Engine.LastCreatedEngine.scenes[0].getTransformNodeByName('true slice of sphere').scaling.x"
    radius_w1=page.evaluate(radius_script)
    screenshot(page,output,"06a-hypersphere-w1")
    operate(page,"w+")
    wait_for_slice(page)
    assert player_position(page)==pose
    assert abs(radius_w1-1.25**.5)<1e-5 and abs(page.evaluate(radius_script)-1.5)<1e-5
    screenshot(page,output,"06b-hypersphere-w2")
    operate(page,"w-")

def capture_state(page):
    return page.evaluate("document.pointerLockElement === document.querySelector('#world')")

def set_pointer_with_t(page, captured):
    if capture_state(page) != captured:
        page.keyboard.press("t")
    page.wait_for_function("(captured) => (document.pointerLockElement === document.querySelector('#world')) === captured",arg=captured)

def verify_console_pointer(page):
    assert not capture_state(page)
    page.locator("#world").focus()
    yaw = page.evaluate("BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.rotation.y")
    camera = "BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.rotation.y"
    key_until(page, "ArrowRight", f"Math.abs({camera}-({yaw}))>.1")
    key_until(page, "ArrowLeft", f"{camera}<=({yaw})")
    page.locator("#pointer-toggle").click()
    page.wait_for_function("document.pointerLockElement?.id==='world'")
    set_pointer_with_t(page,False)
    return {"arrowLookWhileFree":True,"buttonCaptured":True,"keyboardReleased":True}

def verify_w_axis(page, output):
    page.locator("#world").focus()
    def state():
        return page.evaluate("""()=>{
          const scene=BABYLON.Engine.LastCreatedEngine.scenes[0];
          const geometry=scene.meshes.filter(m=>m.isEnabled()).map(m=>m.name+'/'+m.getTotalIndices()).sort().join('|');
          return {xyz:scene.activeCamera.position.asArray(),rotation:scene.activeCamera.rotation.asArray(),w:document.querySelector('#w-value').textContent,geometry}
        }""")
    first=state()
    screenshot(page,output,"echo-same-xyz-w1")
    page.keyboard.press("e")
    wait_for_slice(page)
    second=state()
    screenshot(page,output,"echo-same-xyz-w2")
    assert second["w"]!=first["w"] and second["geometry"]!=first["geometry"]
    page.keyboard.press("q")
    wait_for_slice(page)
    back=state()
    assert back["rotation"]==first["rotation"]==second["rotation"]
    assert back["w"]==first["w"] and back["geometry"]==first["geometry"]
    max_delta=max(abs(a-b) for result in [second,back] for a,b in zip(first["xyz"],result["xyz"]))
    assert max_delta<1e-6,max_delta
    page.keyboard.press("]")
    assert state()["w"]==second["w"]
    page.keyboard.press("[")
    assert state()["w"]==first["w"]
    return {"xyz":first["xyz"],"xyzAfterE":second["xyz"],"xyzAfterQ":back["xyz"],"rotation":first["rotation"],"readouts":[first["w"],second["w"],back["w"]],
            "maxXyzDelta":max_delta,"geometryChangedAndReturned":True,"brackets":True}

def run_two(browser, url, output):
    page, errors, requests = new_page(browser, url + "chapter2/")
    metrics = enter(page, "#gate")
    metrics["immediateMovement"] = verify_immediate_walk(page)
    startup_requests=list(requests)
    metrics["startupResources"]=[urlsplit(req).path for req in startup_requests]
    assert not any("statue" in r or "geometry.js" in r for r in startup_requests)
    metrics["startLongTasks"]=page.evaluate("audit.tasks.slice()")
    metrics["sections"]=[]
    contexts=set()
    for index,(name,beats) in enumerate(ROUTE):
        print(f"  {index+1}. {name}",flush=True)
        assert name in page.locator("#mission-title").inner_text()
        start=page.evaluate("performance.now()")
        background=page.locator("#section-context").inner_text().strip()
        initial_goal=page.locator("#objective").inner_text().strip()
        assert page.locator("#section-context").is_visible() and background and initial_goal and background not in contexts, (name,background,initial_goal)
        assert not page.locator("#gate").is_visible()
        contexts.add(background)
        s={"title":name,"background":background,"initialGoal":initial_goal}
        # A distant F must not grant completion, even when the correct console
        # transformation is already selected. Exercise the actual key listener.
        if index==0:
            screenshot(page,output,"04-echo")
            metrics["wAxis"]=verify_w_axis(page,output)
        page.locator("#world").focus()
        first_goal=page.locator("#objective").inner_text()
        page.keyboard.press("f")
        assert page.locator("#objective").inner_text()==first_goal
        assert not page.locator("#next").is_visible()
        if index==0:
            page.keyboard.press("Escape")
            page.wait_for_selector('body[data-mode="paused"]')
            page.locator("#start").click()
            page.wait_for_selector('body[data-mode="playing"]')
            set_pointer_with_t(page,False)
            page.locator("#expand").click()
            assert page.locator("#instrument").is_hidden()
            page.locator("#expand").click()
            assert page.locator("#instrument").is_visible()
        if index in (0,5,9):
            s["fps"]=sample(page)
        s["layout"]=all_layouts(page)
        for ix,(x,z,actions) in enumerate(beats):
            if index in (1,2) and ix==0:
                # Attempt the ordinary 3D route with the sealed wall or gap unchanged.
                page.locator("#world").focus()
                key_until(page,"w","BABYLON.Engine.LastCreatedEngine.scenes[0].activeCamera.position.z > -.93")
                page.keyboard.down("w")
                page.wait_for_timeout(650)
                page.keyboard.up("w")
                blocked_z=player_position(page)[2]
                assert blocked_z < -.43, (name,blocked_z)
                s["blockedAtZ"]=blocked_z
            if index==6 and ix==0:
                walk_to(page,0,-1.8)
            for action_index,action in enumerate(actions):
                if index==0 and ix==0 and action=="w+":
                    set_pointer_with_t(page,True)
                    set_pointer_with_t(page,False)
                    page.locator('[data-action="w+"]').click()
                    set_pointer_with_t(page,True)
                    metrics["consoleClickThenRecapture"]=True
                elif action=="transit":
                    operate(page,"w+")
                    walk_to(page,x,z)
                    operate(page,"w-")
                elif action=="cargo":
                    solve_cargo(page,output)
                else:
                    if action in ("w+","w-"):
                        page.locator("#world").focus()
                        page.keyboard.press("e" if action=="w+" else "q")
                    else:
                        operate(page,action)
                    if index==6 and ix==0 and action_index==0:
                        screenshot(page,output,"mirror-section")
            if index==2 and ix==0:
                screenshot(page,output,"05-bridge")
            if index==0 and ix==0:
                walk_to(page,0,-4.12)
                screenshot(page,output,"echo-companion")
            if index==6 and ix==0:
                screenshot(page,output,"mirror")
            if index==3 and ix==0:
                photograph_sphere(page,output)
            if index==8 and ix==0:
                walk_to(page,0,-1.5)
                screenshot(page,output,"08-clinic")
            walk_to(page,x,z)
            goal=page.locator("#objective").inner_text()
            if index==0 and ix==0:
                page.wait_for_function("parseFloat(document.querySelector('#range').textContent) <= 2")
                s["receiverRange"]=page.locator("#range").inner_text()
            page.locator("#world").focus()
            page.keyboard.press("f")
            page.wait_for_function("(old) => document.querySelector('#objective').textContent !== old",arg=goal)
        s["completeLayout"]=all_layouts(page)
        s["elapsedMs"]=round(page.evaluate("performance.now()")-start)
        metrics["sections"].append(s)
        if index < len(ROUTE)-1:
            page.locator("#next").wait_for()
            if index==0:
                assert capture_state(page)
                page.keyboard.press("n")
                page.wait_for_function("document.querySelector('#chapter-select').value === '1'")
                metrics["capturedNextKey"]=True
            elif index==1:
                set_pointer_with_t(page,False)
                page.locator("#next").click()
                page.wait_for_function("document.querySelector('#chapter-select').value === '2'")
                metrics["releasedNextClick"]=True
            else:
                page.keyboard.press("n")
    screenshot(page,output,"09-home")
    page.locator("#world").focus()
    page.keyboard.down("ArrowRight")
    try:
        metrics["turning"]=sample(page)
    finally:
        page.keyboard.up("ArrowRight")
    metrics["ending"]=page.locator("#dialogue").inner_text()
    assert "第三个人" in metrics["ending"]
    page.locator("#next").focus()
    page.locator("#next").press("Enter")
    page.wait_for_selector('body[data-mode="ending"]')
    screenshot(page,output,"10-receipt")
    metrics["selectorRoundTrip"]=[]
    for index,(name,_) in enumerate(ROUTE):
        before=page.evaluate("performance.now()")
        page.locator("#chapter-select").select_option(str(index))
        page.wait_for_function("(s)=>document.querySelector('#mission-title').textContent.includes(s)",arg=name)
        page.wait_for_function("body => document.body.dataset.mode==='playing' && document.querySelector('#section-context').textContent.trim()===body",arg=metrics["sections"][index]["background"])
        assert page.locator("#objective").inner_text().strip()==metrics["sections"][index]["initialGoal"]
        assert not page.locator("#gate").is_visible()
        page.evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
        metrics["selectorRoundTrip"].append(round(page.evaluate("performance.now()")-before))
    metrics["longTasks"]=page.evaluate("audit.tasks")
    page.locator("#chapter-select").select_option("5")
    assert not page.locator("#gate").is_visible()
    walk_to(page,0,1.9)
    operate(page,"move","x",1)
    operate(page,"basis")
    readout=page.locator("#w-value").inner_text()
    pose=player_position(page)
    page.keyboard.press("Escape")
    page.wait_for_selector('body[data-mode="paused"]')
    page.reload(wait_until="domcontentloaded")
    metrics["restoredEntry"]=enter(page,"#gate")
    assert metrics["restoredEntry"]["background"]==metrics["sections"][5]["background"]
    assert page.locator("#mission-title").inner_text()=="四维货栈"
    assert page.locator("#w-value").inner_text()==readout
    assert "两个 Z 甲板" in page.locator("#scope").get_attribute("aria-label")
    assert page.locator("#objective").inner_text().strip()==metrics["sections"][5]["initialGoal"]
    restored=player_position(page)
    assert abs(pose[0]-restored[0]) < .05 and abs(pose[2]-restored[2]) < .05
    operate(page,"undo")
    metrics["restoredCargo"]={"readout":readout,"poseXZ":[round(pose[0],2),round(pose[2],2)],"undo":True}
    metrics["pointerControls"] = verify_console_pointer(page)
    metrics.update(requests=len(requests),errors=errors,
                   relativeResources=all(req.startswith(url) or req.startswith("data:") for req in requests))
    page.close()
    return metrics

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="Use an existing deployment. Default: isolated local subdirectory.")
    parser.add_argument("--chromium", default=shutil.which("chromium") or shutil.which("google-chrome"))
    parser.add_argument("--output", type=Path, default=ROOT/"test-results/codex")
    parser.add_argument("--chapter", type=int, choices=[1,2])
    parser.add_argument("--profile-corridor",action="store_true",help="Measure cold start plus idle and walking WebGL frames in chapter one")
    parser.add_argument("--profile-chapters",action="store_true",help="Sample both chapters sequentially in fresh browser contexts at automatic quality")
    parser.add_argument("--swiftshader", action="store_true",help="Explicitly select Chromium's software WebGL rasterizer")
    args=parser.parse_args()
    args.output.mkdir(exist_ok=True,parents=True)
    flags=["--disable-dev-shm-usage"]
    if args.swiftshader:
        flags.extend(["--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    with site(args.url) as url, sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.chromium,headless=True,args=flags)
        result={"browser":browser.version,"softwareRequested":args.swiftshader}
        if args.profile_chapters:
            result.update(profile_chapters(browser,url))
            (args.output/"field-profile.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
            browser.close()
            return
        if args.profile_corridor:
            result["chapter1"]=profile_corridor(browser,url,args.output)
            (args.output/"corridor-profile.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
            assert not result["chapter1"]["errors"],result["chapter1"]["errors"]
            browser.close()
            return
        for i,run in enumerate([run_one,run_two],1):
            if args.chapter and args.chapter!=i:
                continue
            print("Testing chapter",i,flush=True)
            report=run(browser,url,args.output)
            result[f"chapter{i}"]=report
            path=args.output/f"chapter{i}.json"
            path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
            print(path,flush=True)
            assert not report["errors"],report["errors"]
            if i==2:
                assert report["relativeResources"]
                for section in report["sections"]:
                    for state in ("layout","completeLayout"):
                        for viewport,data in section[state].items():
                            assert not data["issues"],(section["title"],state,viewport,data["issues"])
        browser.close()

if __name__ == "__main__":
    main()
