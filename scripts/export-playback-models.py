"""Exports the Playback cassette and case to glTF for the case study's live tape.

The models come from the Playback app's own Blender scripts (~/Developer/Playback/Model),
so the web tape stays the same measured model as the app's.

Usage:  /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/export-playback-models.py -- clear|solid|case
"""
import bpy, os, sys

kind = sys.argv[sys.argv.index("--") + 1]
model_dir = os.path.expanduser("~/Developer/Playback/Model")
script = "build_case.py" if kind == "case" else "build_cassette.py"
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "models", "playback",
                   "case.glb" if kind == "case" else f"cassette-{kind}.glb")

# The sticker's window (src/lib/playback/content.ts STICKER), in mm. The solid shell's moulded
# window, liner holes and window panes all size from WIN_W/WIN_H, so the app's script builds
# them to fit the sticker.
STICKER_WINDOW = (70.6, 16.0)

# The app's scripts read their options from sys.argv.
sys.argv = [script, kind]
path = os.path.join(model_dir, script)
source = open(path).read()
if kind == "solid":
    source = source.replace("WIN_W, WIN_H = 23.6, 17.5", "WIN_W, WIN_H = %s, %s" % STICKER_WINDOW)
    assert "WIN_W, WIN_H = 70.6" in source, "build_cassette.py's window line changed"
g = {"__name__": "__main__", "__file__": path}
exec(compile(source, path, "exec"), g)

if kind != "case":
    import bmesh
    MM, HUB_R = 0.001, 10.8

    # Orange leader clamps, seated in each hub's notch. Children of the hub, so they turn with it.
    for name in ("HubL", "HubR"):
        me = bpy.data.meshes.new(name.replace("Hub", "Clamp"))
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(1.0 * MM, 3.8 * MM, 3.0 * MM), verts=bm.verts)
        bmesh.ops.translate(bm, vec=((HUB_R - 0.6) * MM, 0, 0), verts=bm.verts)
        bm.to_mesh(me)
        bm.free()
        clamp = bpy.data.objects.new(me.name, me)
        bpy.context.scene.collection.objects.link(clamp)
        clamp.parent = bpy.data.objects[name]

    # Face-on UVs on the unit-radius packs, for the winding texture.
    for name in ("PackL", "PackR"):
        me = bpy.data.objects[name].data
        bm = bmesh.new()
        bm.from_mesh(me)
        uv = bm.loops.layers.uv.verify()
        for face in bm.faces:
            for loop in face.loops:
                loop[uv].uv = ((loop.vert.co.x + 1) / 2, (loop.vert.co.z + 1) / 2)
        bm.to_mesh(me)
        bm.free()

    # Full-face stickers, 88 x 38.6 mm, a hair proud of each face, with the window on the hub line.
    # Their UVs point at the Sticker rectangles on the print sheet (src/lib/playback/sheet.ts).
    g["CANVAS"].update({"StickerA": (115, 55, 88.0, 38.6), "StickerB": (115, 100, 88.0, 38.6)})
    top = g["H"] / 2 - 6.8
    stickers = [g["quad"]("Sticker" + s, 88.0, 38.6, top - 38.6 / 2, side * (g["BODY_T"] / 2 + 0.06), side)
                for side, s in ((-1, "A"), (1, "B"))]
    g["to_metres"](stickers)
    for sticker in stickers:
        sticker.parent = bpy.data.objects["Cassette"]

bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True,
                          export_materials="EXPORT", export_texcoords=True, export_normals=True,
                          export_draco_mesh_compression_enable=True)
print("exported", out, os.path.getsize(out))
