"""Bake the four chamber materials into one mipmapped albedo atlas.

Each cell family has a different physical trace. The large cut, its occlusion,
and the much smaller mineral grain are baked together so distant rooms can use
the same one-sample material as a wall beside the player.
"""
from pathlib import Path
import numpy as np
from PIL import Image

SIZE = 1024
OUT = Path(__file__).resolve().parents[1] / 'dist/assets/pressure-hull.jpg'
rng = np.random.default_rng(414)
v, u = np.mgrid[-1:1:complex(SIZE), -1:1:complex(SIZE)]


def pigment(rgb):
    return np.asarray(rgb, dtype=float)


def noise(samples):
    values = rng.integers(0, 256, size=(samples, samples), dtype=np.uint8)
    field = Image.fromarray(values).resize((SIZE, SIZE), Image.Resampling.BICUBIC)
    return (np.asarray(field, dtype=float) - 127.5) / 127.5


def strata(axis):
    if axis == 'W':
        # A shell growing from the point where a neighbouring face folds in.
        radius = np.hypot((u + 1.19) * .92, (v + .42) * 1.29)
        trace = 3.1 * radius + .25 * u - .12 * np.cos(3.0 * v)
        ground, mineral, seam = (65, 92, 100), (134, 161, 162), (114, 223, 204)
    elif axis == 'X':
        # Sheared tablets with a sharp, off-centre cleavage.
        trace = 2.9 * u + 2.3 * np.abs(v + .29 * u - .22) + .21 * np.cos(2.2 * v)
        ground, mineral, seam = (83, 73, 80), (158, 133, 123), (237, 184, 121)
    elif axis == 'Y':
        # Mineral folds fork as two growth fronts collide.
        trace = 2.9 * np.minimum(np.hypot(u + .98, .67 * v - 1.30),
                                  np.hypot(u - 1.41, 1.07 * v + .92)) + .78 * v
        ground, mineral, seam = (60, 87, 88), (132, 155, 141), (170, 219, 162)
    else:
        # Inclined sheets drift around a narrow lenticular void.
        trace = 2.5 * v + 1.25 * u + .78 * np.hypot(.39 * u - .1, v + .31)
        ground, mineral, seam = (65, 72, 103), (145, 141, 165), (197, 177, 241)

    drift = .24 * noise(4) + .12 * noise(9)
    bands = trace + drift * .16
    phase = np.mod(bands, 1)
    grain = .55*noise(8) + .25*noise(32) + .10*noise(120) + .10*noise(SIZE)
    # Slowly varying stone value, then a bevel on one side of each recessed line.
    blend = .38 + .21 * np.cos(1.18 * bands) + .22 * grain
    stone = pigment(ground) + blend[..., None] * (pigment(mineral) - pigment(ground))
    stone *= (1 - .19*phase - .43*np.exp(-((phase-.015)/.019)**2))[..., None]
    stone += (19*np.exp(-((phase-.050)/.017)**2))[..., None]
    secondary = np.cos((bands + .02*noise(6))*np.pi*32)
    stone += (2.7*secondary + 6*grain)[..., None]
    # Discontinuous inclusions sit inside a few principal fractures.
    vein = np.exp(-((phase-.105)/.012)**2) * np.clip(1.2 + np.sin(1.72*bands - 2.3*v)*2.0, 0, 1)
    stone += vein[..., None] * (pigment(seam) - stone) * .78
    edge = np.minimum(1 - abs(u), 1 - abs(v))
    stone *= (.72 + .28 * np.minimum(edge / .14, 1))[..., None]
    return Image.fromarray(np.clip(stone, 0, 255).astype('uint8'))


if __name__ == '__main__':
    atlas = Image.new('RGB', (SIZE*2, SIZE*2))
    for axis, tile in [('W',(0,0)), ('X',(1,0)), ('Y',(0,1)), ('Z',(1,1))]:
        atlas.paste(strata(axis), (SIZE*tile[0], SIZE*tile[1]))
    atlas.save(OUT, quality=88, subsampling=0, optimize=True)
