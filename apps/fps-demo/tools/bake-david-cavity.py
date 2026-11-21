"""Bake diffuse ambient visibility into David's unused U coordinate.
Run with Blender's Python: blender -b -P tools/bake-david-cavity.py -- dist/assets/classical-statues
"""
import json
import math
from pathlib import Path
import sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def bake(directory):
    manifest = (directory / "geometry.js").read_text().split(" = ", 1)[1]
    manifest = json.loads(manifest.rstrip(";\n"))["david"]

    def read(lod):
        spec = manifest[lod]
        raw = bytearray((directory / spec["file"]).read_bytes())
        def field(name, code):
            offset, size = spec["fields"][name]
            return memoryview(raw)[offset:offset + size * 4].cast(code)
        return raw, field

    _, field = read("high")
    verts = field("positions", "f")
    indices = field("indices", "I")
    tree = BVHTree.FromPolygons([Vector(verts[i:i+3]) for i in range(0, len(verts), 3)],
                                [tuple(indices[i:i+3]) for i in range(0, len(indices), 3)], all_triangles=True)
    # Golden-angle sphere: cosine weights approximate diffuse hemispherical irradiance.
    directions = []
    for i in range(64):
        y = 1 - 2 * (i + .5) / 64
        r, a = math.sqrt(1 - y*y), i * math.pi * (3 - math.sqrt(5))
        directions.append(Vector((r*math.cos(a), y, r*math.sin(a))))
    for lod in ("low", "mid", "high"):
        raw, field = read(lod)
        verts, normals, uv = field("positions", "f"), field("normals", "f"), field("uvs", "f")
        for i in range(0, len(verts), 3):
            n = Vector(normals[i:i+3])
            origin = Vector(verts[i:i+3]) + n * (.007 if lod == "high" else .014)
            total = blocked = 0
            for d in directions:
                w = n.dot(d)
                if w > 0:
                    total += w
                    hit = tree.ray_cast(origin, d, .23)[3]
                    if hit is not None:
                        blocked += w * (1 - hit/.23)
            uv[(i//3)*2] = 1 - blocked / max(total, .001)
        (directory / manifest[lod]["file"]).write_bytes(raw)


if __name__ == "__main__":
    bake(Path(sys.argv[sys.argv.index("--") + 1]))
