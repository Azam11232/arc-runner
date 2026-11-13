import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

interface BakeOptions {
  cast?: boolean
  receive?: boolean
}

/** Merge geometries, converting to non-indexed first when indexed and non-indexed are mixed. */
export function mergeSafe(geos: THREE.BufferGeometry[]) {
  const mixed = geos.some((g) => !g.index) && geos.some((g) => g.index)
  const list = mixed ? geos.map((g) => (g.index ? g.toNonIndexed() : g)) : geos
  return mergeGeometries(list, false)
}

/** Merge a group's direct Mesh children by material (in place). Other children are left untouched. */
export function bakeGroup(group: THREE.Group, opts: BakeOptions = {}) {
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const meshes = group.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh)
  for (const child of meshes) {
    const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material>
    mesh.updateMatrix()
    const geo = mesh.geometry.clone()
    geo.applyMatrix4(mesh.matrix)
    const list = buckets.get(mesh.material) ?? []
    list.push(geo)
    buckets.set(mesh.material, list)
    group.remove(mesh)
  }
  for (const [mat, geos] of buckets) {
    const merged = mergeSafe(geos)
    for (const g of geos) g.dispose()
    if (!merged) continue
    const out = new THREE.Mesh(merged, mat)
    out.castShadow = opts.cast ?? false
    out.receiveShadow = opts.receive ?? false
    group.add(out)
  }
  return group
}
