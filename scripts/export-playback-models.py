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

bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True,
                          export_materials="EXPORT", export_texcoords=True, export_normals=True,
                          export_draco_mesh_compression_enable=True)
print("exported", out, os.path.getsize(out))
