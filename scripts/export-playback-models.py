"""Exports the Playback cassette and case to glTF for the case study's live tape.

The models come from the Playback app's own Blender scripts (~/Developer/Playback/Model),
so the web tape stays the same measured model as the app's.

Usage:  /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/export-playback-models.py -- clear|solid|case
"""
import bpy, os, runpy, sys

kind = sys.argv[sys.argv.index("--") + 1]
model_dir = os.path.expanduser("~/Developer/Playback/Model")
script = "build_case.py" if kind == "case" else "build_cassette.py"
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "models", "playback",
                   "case.glb" if kind == "case" else f"cassette-{kind}.glb")

# The app's scripts read their options from sys.argv.
sys.argv = [script, kind]
runpy.run_path(os.path.join(model_dir, script), run_name="__main__")

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

bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True,
                          export_materials="EXPORT", export_texcoords=True, export_normals=True,
                          export_draco_mesh_compression_enable=True)
print("exported", out, os.path.getsize(out))
