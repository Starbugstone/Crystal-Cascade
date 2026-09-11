"""Blender source and deterministic mesh export for the village field and park.

Run Blender --background --python this-file.py -- /absolute/repository/path
Coordinates in authoring helpers use the game's X/Y-up/Z convention.
"""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(sys.argv[sys.argv.index('--') + 1])
SOURCE = ROOT / 'art' / 'leisure'
OUTPUT = ROOT / 'src' / 'assets'
SOURCE.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
materials = {}
models = {}
active = None
joint = 'body'
pivot = (0, 0, 0)

def vec(p):
    return Vector((p[0], -p[2], p[1]))

def material(color):
    if color not in materials:
        m = bpy.data.materials.new(color)
        rgb = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
        rgb = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
        m.diffuse_color = (*rgb, 1)
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*rgb, 1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .88
        m['gameColor'] = color
        materials[color] = m
    return materials[color]

def model(name):
    global active, joint, pivot
    active = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(active)
    models[name] = active
    joint, pivot = 'body', (0, 0, 0)

def finish(obj, name, color):
    obj.name = name
    obj.parent = active
    obj.data.materials.append(material(color))
    obj['joint'] = joint
    obj['pivot'] = pivot
    return obj

def box(name, size, pos, color, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=vec(pos))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft timber edges', 'BEVEL')
        mod.width, mod.segments = bevel, 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj, name, color)

def ball(name, size, pos, color):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=1, location=vec(pos))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    for face in obj.data.polygons:
        face.use_smooth = True
    return finish(obj, name, color)

def rod(name, start, end, radius, color):
    a, b = vec(start), vec(end)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=(b-a).length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, color)

def loft(name, rings, color):
    # A shaped, connected surface; each ring is center X/Y/Z and horizontal/vertical radii.
    vertices, faces = [], []
    for x, y, z, rx, ry in rings:
        for i in range(12):
            a = i * math.tau / 12
            vertices.append(tuple(vec((x + math.cos(a)*rx, y + math.sin(a)*ry, z))))
    for ring in range(len(rings)-1):
        for i in range(12):
            a, b = ring*12+i, ring*12+(i+1)%12
            faces.append((a, b, b+12, a+12))
    faces.extend([tuple(reversed(range(12))), tuple(range((len(rings)-1)*12, len(rings)*12))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for face in mesh.polygons:
        face.use_smooth = True
    return finish(obj, name, color)

wood, cream, teal, green = '#a37d55', '#e1cfab', '#648d89', '#91a66e'

def tree(x, z):
    rod('Branched tree trunk', (x, .08, z), (x, 2.1, z), .12, wood)
    for dx, dz in [(-.4, 0), (.4, .25), (0, -.35)]:
        rod('Tree branch', (x, 1.2, z), (x+dx, 2.35, z+dz), .07, wood)
        ball('Soft leaf crown', (.68, .75, .63), (x+dx, 2.55, z+dz), green)

def bench(x, z):
    for dx in [-.6, .6]:
        rod('Bench legs', (x+dx, .07, z), (x+dx, .72, z), .055, teal)
    for dz in [-.16, 0, .16]:
        box('Bench seat slat', (1.55, .075, .13), (x, .51, z+dz), wood)
    for y in [.77, .94]:
        box('Bench back slat', (1.55, .12, .08), (x, y, z-.22), wood)

for level in range(1, 4):
    model(f'field{level}')
    box('Meadow turf', (6.2, .12, 5.5), (0, .025, 0), '#9eae79')
    for z in [-2.65, 2.65]:
        for x in [-3, -2, -1, 0, 1, 2, 3]:
            if z > 0 and abs(x) < 1: continue
            box('Fence post', (.12, 1.03, .12), (x, .53, z), cream)
        for y in [.43, .83]:
            if z < 0:
                box('Back fence rail', (6, .11, .09), (0, y, z), cream)
            else:
                for side in [-1, 1]:
                    box('Front fence rail', (2, .11, .09), (side*2, y, z), cream)
    for x in [-3, 3]:
        for z in [-1.35, 0, 1.35]:
            box('Side fence post', (.12, 1.03, .12), (x, .53, z), cream)
        for y in [.43, .83]:
            box('Side fence rail', (.09, .11, 5.3), (x, y, 0), cream)
    box('Water trough', (.6, .4, 1.2), (2.35, .28, -.8), teal)
    box('Trough water', (.46, .025, 1.04), (2.35, .49, -.8), '#91b8b0')
    for i in range(5):
        ball('Pasture grass', (.18, .15, .16), (-2.2+i*.7, .12, 1.7), '#7f9863')
    if level >= 2:
        for x in [-2.6, -.8]:
            for z in [-2.3, -1.1]:
                box('Shelter upright', (.13, 1.7, .13), (x, .9, z), wood)
        roof = box('Sloping teal shelter roof', (2.2, .16, 1.75), (-1.7, 1.87, -1.7), teal)
        roof.rotation_euler.x = .13
        for i in range(5):
            box('Shelter back board', (.33, 1.3, .1), (-2.4+i*.35, .75, -2.3), wood)
        box('Hay bale', (.72, .45, .52), (-2.1, .3, -1.65), '#c9b06f', .08)
    if level >= 3:
        tree(2.2, -1.9)
        bench(-1.9, 1.85)
        for x in [-.78, .78]:
            box('Gate pillar', (.18, 1.4, .18), (x, .75, 2.65), wood)
        box('Welcome gate arch', (1.9, .2, .2), (0, 1.48, 2.65), wood)

for level in range(1, 4):
    model(f'park{level}')
    box('Park lawn', (6.2, .12, 5.5), (0, .025, 0), '#92a873')
    box('Walking path', (5.9, .025, .85), (0, .10, 1.65), '#d8c9a5')
    box('Entrance path', (.8, .025, .6), (0, .10, 2.375), '#d8c9a5')
    for x in [-2.9, 2.9]:
        box('Low stone edging', (.16, .22, 5.4), (x, .19, 0), cream)
    box('Sand play area', (2.9, .11, 2.2), (-1.15, .15, -.8), '#d9bd83')
    # Playground is present from the first build: A-frame, two suspended seats.
    for x in [-2.2, -.35]:
        for z in [-1.55, -.15]:
            rod('Swing A-frame', (x, .2, z), (x, 2.15, -.85), .065, teal)
    rod('Swing crossbar', (-2.4, 2.15, -.85), (-.15, 2.15, -.85), .09, teal)
    for x in [-1.7, -.85]:
        for dx in [-.19, .19]:
            rod('Swing chain', (x+dx, 2.1, -.85), (x+dx, .65, -.85), .014, '#72766b')
        box('Swing seat', (.55, .09, .3), (x, .61, -.85), wood)
    bench(1.6, .6)
    if level >= 2:
        # A raised slide with guard rails, curved runout, ladder and steps.
        box('Slide tower platform', (.85, .12, .75), (1.5, 1.45, -1.65), wood)
        for x in [1.13, 1.87]:
            rod('Slide tower post', (x, .12, -1.8), (x, 2.1, -1.8), .055, teal)
            rod('Slide guard rail', (x, 2.1, -1.8), (x, 1.95, -1.2), .045, teal)
            rod('Ladder side', (x, .15, -2.5), (x, 1.5, -1.9), .045, teal)
        for i in range(5):
            rod('Ladder rung', (1.13, .25+i*.24, -2.46+i*.11), (1.87, .25+i*.24, -2.46+i*.11), .035, wood)
        vertices, faces = [], []
        for z, y in [(-1.5, 1.5), (-1.1, 1.4), (-.6, .72), (-.15, .28), (.12, .25)]:
            for x, lip in [(1.1, .12), (1.16, 0), (1.84, 0), (1.9, .12)]:
                vertices.append(tuple(vec((x, y+lip, z))))
        for i in range(4):
            for k in range(3):
                a = i*4+k
                faces.append((a, a+4, a+5, a+1))
        mesh = bpy.data.meshes.new('Curved slide')
        mesh.from_pydata(vertices, [], faces)
        obj = bpy.data.objects.new('Curved slide', mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj, 'Curved slide', '#be8171')
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new('Slide thickness', 'SOLIDIFY')
        mod.thickness = .045
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if level >= 3:
        tree(-2.35, 1.05)
        for x in [-2.4, 2.4]:
            box('Flower bed', (.85, .28, .5), (x, .2, 2.2), cream)
            for i in range(3):
                ball('Flower foliage', (.16, .19, .18), (x-.25+i*.25, .45, 2.2), green)
                ball('Flower', (.09, .07, .08), (x-.25+i*.25, .61, 2.2), '#d7ad77')
        rod('Park lamp', (2.6, .1, -2.3), (2.6, 2.5, -2.3), .06, teal)
        ball('Cream lamp globe', (.18, .23, .18), (2.6, 2.62, -2.3), '#efdba0')

for level in range(1, 4):
    model(f'heritage{level}')
    for i in range(level):
        x = -.7 + i*.7
        box('Heritage flower planter', (.58,.36,.45), (x,.24,-2.15), cream)
        ball('Heritage planting', (.24,.3,.18), (x,.62,-2.15), green)
        ball('Heritage flowers', (.15,.1,.12), (x,.89,-2.15), '#d7ad77')

model('horse')
loft('Shaped horse body', [(0,1.05,-.7,.16,.18),(0,1.1,-.48,.32,.35),(0,1.12,.12,.28,.33),(0,1.13,.5,.2,.25)], '#a77952')
loft('Rising neck', [(0,1.12,.25,.22,.25),(0,1.44,.46,.18,.29),(0,1.67,.66,.14,.19)], '#a77952')
for i, (x,z) in enumerate([(-.2,-.43),(.2,-.43),(-.19,.34),(.19,.34)]):
    joint, pivot = f'leg{i}', (x,.98,z)
    rod('Tapered upper leg', (x,.99,z), (x,.55,z+.04), .083, '#a77952')
    rod('Slender lower leg', (x,.55,z+.04), (x,.15,z), .05, '#be936d')
    box('Dark hoof', (.15,.14,.2), (x,.08,z+.025), '#5c5242', .02)
joint, pivot = 'head', (0,1.55,.57)
loft('Horse face and muzzle', [(0,1.71,.53,.14,.17),(0,1.72,.76,.15,.18),(0,1.56,1.02,.12,.11)], '#ad8059')
ball('Soft muzzle', (.13,.105,.12), (0,1.55,1.02), '#d0b18a')
for side in [-1,1]:
    ball('Alert ear', (.045,.19,.08), (side*.1,1.94,.6), '#a77952')
    ball('Horse eye', (.025,.028,.029), (side*.137,1.77,.77), '#363c33')
    ball('Nostril', (.018,.017,.025), (side*.098,1.58,1.1), '#62513d')
joint, pivot = 'body', (0,0,0)
for i in range(6):
    ball('Short mane', (.055,.12,.09), (0,1.37+i*.07,.29+i*.06), '#584e3c')
joint, pivot = 'tail', (0,1.14,-.68)
loft('Flowing tail', [(0,1.15,-.64,.075,.09),(0,.85,-.8,.11,.19),(0,.43,-.88,.065,.18)], '#584e3c')

model('dog')
loft('Dog torso', [(0,.38,-.33,.1,.13),(0,.39,-.2,.16,.19),(0,.42,.2,.15,.19),(0,.48,.3,.11,.14)], '#bd9569')
for i, (x,z) in enumerate([(-.1,-.22),(.1,-.22),(-.1,.2),(.1,.2)]):
    joint, pivot = f'leg{i}', (x,.36,z)
    rod('Dog leg', (x,.36,z), (x,.07,z+.025), .045, '#bd9569')
    ball('Paw', (.06,.05,.08), (x,.05,z+.055), '#dfc59c')
joint, pivot = 'head', (0,.49,.25)
ball('Dog head', (.15,.17,.17), (0,.6,.31), '#bd9569')
ball('Dog muzzle', (.105,.08,.12), (0,.55,.47), '#dfc59c')
ball('Dog nose', (.042,.035,.036), (0,.58,.565), '#394135')
for side in [-1,1]:
    ball('Floppy ear', (.05,.15,.09), (side*.14,.58,.26), '#8f7254')
    ball('Dog eye', (.025,.025,.022), (side*.095,.67,.43), '#394135')
joint, pivot = 'tail', (0,.47,-.3)
rod('Wagging tail', (0,.47,-.3), (0,.68,-.53), .045, '#bd9569')
joint, pivot = 'body', (0,0,0)
box('Teal collar', (.27,.045,.075), (0,.49,.255), teal, .01)

model('walker')
loft('Tailored walking coat', [(0,.77,-.14,.15,.08),(0,1,-.13,.22,.18),(0,1.23,-.1,.19,.17),(0,1.27,.1,.19,.17),(0,1,.14,.21,.16),(0,.77,.14,.15,.08)], '#648d89')
ball('Walker head', (.15,.21,.15), (0,1.59,0), '#cba17a')
ball('Hat crown', (.19,.09,.18), (0,1.79,0), cream)
ball('Hat brim', (.27,.025,.25), (0,1.73,0), cream)
for i, x in enumerate([-.105,.105]):
    joint, pivot = f'leg{i}', (x,.8,0)
    rod('Trouser leg', (x,.8,0), (x,.16,0), .085, '#697968')
    box('Walking shoe', (.18,.12,.3), (x,.09,.075), '#655540')
joint, pivot = 'body', (0,0,0)
for side in [-1,1]:
    rod('Coat sleeve', (side*.2,1.35,0), (side*.31,1.03,.07), .08, teal)
    rod('Lower sleeve', (side*.31,1.03,.07), (side*.38,.92,.18), .065, teal)
    ball('Hand', (.06,.08,.06), (side*.38,.87,.2), '#cba17a')

# Explicit export: bake evaluated Blender meshes, retaining small animation pivots.
# The game supplies its own shared materials, batching, shadows and lifetime.
bpy.context.view_layer.update()
payload = {'format': 1, 'generator': 'Blender', 'models': {}}
depsgraph = bpy.context.evaluated_depsgraph_get()
for name, root in models.items():
    parts = []
    for obj in root.children:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        origin = list(obj['pivot'])
        positions, normals = [], []
        transform = obj.matrix_world
        normal_matrix = transform.to_3x3().inverted().transposed()
        for triangle in mesh.loop_triangles:
            for index in triangle.vertices:
                p = transform @ mesh.vertices[index].co
                normal = mesh.vertices[index].normal if mesh.polygons[triangle.polygon_index].use_smooth else triangle.normal
                n = (normal_matrix @ normal).normalized()
                positions.extend(round(v, 5) for v in (p.x-origin[0], p.z-origin[1], -p.y-origin[2]))
                normals.extend(round(v, 5) for v in (n.x,n.z,-n.y))
        parts.append({'name': obj.name, 'joint': obj['joint'], 'pivot': origin,
                      'color': obj.data.materials[0]['gameColor'], 'positions': positions, 'normals': normals})
        evaluated.to_mesh_clear()
    # Join by joint/material, then index shared vertices. This retains animation
    # pivots and eliminates duplicated triangle data and tiny runtime draw calls.
    buckets = {}
    for part in parts:
        key = (part['joint'], part['color'])
        if key not in buckets:
            buckets[key] = {**part, 'positions': [], 'normals': []}
        buckets[key]['positions'].extend(part['positions'])
        buckets[key]['normals'].extend(part['normals'])
    for part in buckets.values():
        positions, normals, indices, seen = [], [], [], {}
        for i in range(0, len(part['positions']), 3):
            key = tuple(part['positions'][i:i+3] + part['normals'][i:i+3])
            if key not in seen:
                seen[key] = len(positions)//3
                positions.extend(key[:3])
                normals.extend(key[3:])
            indices.append(seen[key])
        part.update(positions=positions, normals=normals, indices=indices)
    payload['models'][name] = list(buckets.values())
(OUTPUT / 'leisure-meshes.json').write_text(json.dumps(payload, separators=(',', ':')), encoding='utf-8')

# Retain a standard interchange export as well as the compact runtime export.
bpy.ops.export_scene.gltf(filepath=str(SOURCE / 'leisure.glb'), export_format='GLB')
for i, (name, root) in enumerate(models.items()):
    root.location = vec(((i%3-1)*8, 0, (i//3-1)*7))

bpy.ops.object.light_add(type='AREA', location=(0,-8,18))
bpy.context.object.data.energy = 2500
bpy.context.object.data.shape = 'DISK'
bpy.context.object.data.size = 12
bpy.context.scene.world.color = (.65,.65,.65)
bpy.ops.object.camera_add(location=(18,-26,26))
camera = bpy.context.object
camera.rotation_euler = (Vector((0,0,.5))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 34
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 1500
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.render.filepath = str(SOURCE / 'review.png')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / 'leisure.blend'))
bpy.ops.render.render(write_still=True)
print('LEISURE_EXPORT', {name: sum(len(p['indices'])//3 for p in parts) for name,parts in payload['models'].items()})
