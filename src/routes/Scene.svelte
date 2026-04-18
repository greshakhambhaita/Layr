<script>
  import { T, useTask, useThrelte } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import {
    BloomEffect,
    EffectComposer,
    EffectPass,
    RenderPass,
  } from "postprocessing";
  import * as THREE from "three";

  // ─── Renderer / bloom ─────────────────────────────────────────────────────
  const { scene, camera, renderer, size } = useThrelte();

  const composer = new EffectComposer(renderer);
  const bloom = new BloomEffect({
    intensity: 0.8, // Increased from 0.21 for more glow
    luminanceThreshold: 0.15,
    luminanceSmoothing: 0.4,
    mipmapBlur: true,
  });

  $effect(() => {
    composer.removeAllPasses();
    composer.addPass(new RenderPass(scene, camera.current));
    composer.addPass(new EffectPass(camera.current, bloom));
  });

  $effect(() => {
    composer.setSize($size.width, $size.height);
  });

  useTask(
    (delta) => {
      composer.render(delta);
    },
    { autoInvalidate: false },
  );

  // ─── Enable pointer events on the renderer DOM element ───────────────────
  // OrbitControls attaches to renderer.domElement — make sure it can receive events
  $effect(() => {
    const el = renderer.domElement;
    el.style.pointerEvents = "auto";
    el.style.zIndex = "2";
  });

  // ─── Load GLB once, clone per cell ────────────────────────────────────────
  const gltf = useGltf("/glowingcube.glb");

  // ─── Grid config ──────────────────────────────────────────────────────────
  const COLS = 5;
  const ROWS = 5;
  const DEPTH = 5;
  const CUBE_SCALE = 0.13; // Scaled down from 0.22 for density
  const GAP = 0.35; // Reduced from 0.7 to fit in same footprint

  const cubes = [];
  for (let z = 0; z < DEPTH; z++) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        // surface depth: 0 = outermost layer, 1 = one layer in, etc.
        const surfaceDepth = Math.min(
          x,
          COLS - 1 - x,
          y,
          ROWS - 1 - y,
          z,
          DEPTH - 1 - z,
        );
        cubes.push({
          id: `${x}-${y}-${z}`,
          bx: (x - (COLS - 1) / 2) * GAP,
          by: (y - (ROWS - 1) / 2) * GAP,
          bz: (z - (DEPTH - 1) / 2) * GAP,
          phase: (x + y * COLS + z * COLS * ROWS) * 0.38,
          surfaceDepth,
        });
      }
    }
  }

  // ─── Border wireframe material (shared) ───────────────────────────────────
  // We derive a bounding box from the loaded geometry and build a LineSegments
  // wireframe so each cube gets thin dark edges.
  const borderMat = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });

  // Clones + wireframes — built once asset resolves
  let clones = $state([]);
  let wireframes = $state([]);

  // ─── Free drag rotation (all axes, quaternion-based) ────────────────────
  // Using a quaternion accumulator avoids gimbal lock and allows the user
  // to tumble the grid to any arbitrary orientation.
  const rotationQuat = new THREE.Quaternion(); // current displayed rotation
  const targetQuat = new THREE.Quaternion(); // rotation we're lerping to
  let isDragging = false;
  let previousX = 0;
  let previousY = 0;
  let lastDragAt = 0; // timestamp of last drag move

  // Track quaternion components as reactive state so Threlte reacts
  let qx = $state(0),
    qy = $state(0),
    qz = $state(0),
    qw = $state(1);

  const sensitivity = 0.004;

  $effect(() => {
    const handlePointerDown = (e) => {
      isDragging = true;
      previousX = e.clientX;
      previousY = e.clientY;
    };

    const handlePointerMove = (e) => {
      if (!isDragging) return;

      const dx = e.clientX - previousX;
      const dy = e.clientY - previousY;
      previousX = e.clientX;
      previousY = e.clientY;

      // Horizontal drag → rotate around world Y
      // Vertical drag   → rotate around world X
      const yawQ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        dx * sensitivity,
      );
      const pitchQ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        dy * sensitivity,
      );

      targetQuat.premultiply(yawQ).premultiply(pitchQ);
      lastDragAt = performance.now() / 1000;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  });

  const identityQuat = new THREE.Quaternion();
  let baseYaw = 0;
  const baseTilt = new THREE.Euler(0.2, 0.4, 0); // Slight tilt

  useTask(() => {
    const now = performance.now() / 1000;
    const idleForRotation = now - lastDragAt > 0.6; // grace period before returning

    if (idleForRotation) {
      // Slow idle spin
      baseYaw += 0.002;
      identityQuat.setFromEuler(
        new THREE.Euler(baseTilt.x, baseYaw, baseTilt.z),
      );

      // Slerp back to original orientation — faster return
      targetQuat.slerp(identityQuat, 0.045);
    }

    rotationQuat.slerp(targetQuat, 0.1);
    qx = rotationQuat.x;
    qy = rotationQuat.y;
    qz = rotationQuat.z;
    qw = rotationQuat.w;
  });

  // ─── Floating animation (whole grid, not per-cube) ──────────────────────
  let floatTime = $state(0);
  let floatY = $state(0);

  useTask((delta) => {
    floatTime += delta;
    floatY = Math.sin(floatTime * 0.9) * 0.1;
  });

  // ─── Color Animation ──────────────────────────────────────────────────────
  let colorCycleTime = $state(0);
  let fillCol = $state("#4488ff");
  let coreCol = $state("#ffaa55");

  const startFill = new THREE.Color("#4488ff"); // Blue
  const endFill = new THREE.Color("#ff44bb"); // Pink
  const startCore = new THREE.Color("#ffaa55"); // Orange
  const endCore = new THREE.Color("#ffccaa"); // Peach

  useTask((delta) => {
    colorCycleTime += delta * 0.5; // slow speed
    const t = (Math.sin(colorCycleTime) + 1) / 2; // 0 to 1

    const tempFill = startFill.clone().lerp(endFill, t);
    const tempCore = startCore.clone().lerp(endCore, t);

    fillCol = `#${tempFill.getHexString()}`;
    coreCol = `#${tempCore.getHexString()}`;
  });

  $effect(() => {
    if (!$gltf) return;

    clones = cubes.map(() => {
      const clone = $gltf.scene.clone(true);
      clone.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color.set(0xffffff);
          child.material.emissive.set(0x333333); // subtle base glow
          child.material.emissiveIntensity = 2.0;

          // Use EdgesGeometry instead of WireframeGeometry to remove diagonals
          const edgeGeo = new THREE.EdgesGeometry(child.geometry);
          const edges = new THREE.LineSegments(edgeGeo, borderMat);
          child.add(edges);
        }
      });
      return clone;
    });
  });

  // ─── Interactive Repulsion (surface layers only) ─────────────────────────
  // The cursor is always projected to Z=0 in world space (the "front face"
  // of the group at position.x=1.4). Repulsion is then computed purely in
  // XY so inner cubes are never reached from the inside.
  let displacements = $state(cubes.map(() => ({ x: 0, y: 0, z: 0 })));
  const mousePosition = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const worldMouse = new THREE.Vector3();
  // Project onto the front face of the grid cluster (z=0 in group-local space)
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  // Track when the cursor last moved so we can fade displacements back to 0
  let lastMouseMoveAt = 0;
  const IDLE_RETURN_DELAY = 0.4; // seconds of stillness before returning

  $effect(() => {
    const updateMouse = (e) => {
      mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
      lastMouseMoveAt = performance.now() / 1000;
    };
    window.addEventListener("pointermove", updateMouse);
    return () => window.removeEventListener("pointermove", updateMouse);
  });

  // ─── Responsive Positioning ─────────────────────────────────────────────
  let groupX = $derived(0);
  let groupY = $derived(-0.29);
  let groupScale = $derived($size.width < 768 ? 0.75 : 1.0);

  useTask(() => {
    if (!camera.current) return;

    const now = performance.now() / 1000;
    const isIdle = now - lastMouseMoveAt > IDLE_RETURN_DELAY;

    raycaster.setFromCamera(mousePosition, camera.current);
    raycaster.ray.intersectPlane(plane, worldMouse);

    // Anchor offset — use the dynamic groupX/groupY
    const anchor = new THREE.Vector3(groupX, groupY, 0);
    const localMouse = worldMouse.clone().sub(anchor);

    const radius = 1.2;
    const strength = 0.8;
    // Surface layer limit: only repel cubes 0 or 1 layers deep from surface
    const MAX_SURFACE_DEPTH = 1;

    displacements = cubes.map((cube, i) => {
      let tx = 0,
        ty = 0,
        tz = 0;

      if (!isIdle && cube.surfaceDepth <= MAX_SURFACE_DEPTH) {
        // Only measure XY distance
        const dx = cube.bx - localMouse.x;
        const dy = cube.by - localMouse.y;
        const dist2D = Math.sqrt(dx * dx + dy * dy);

        if (dist2D < radius && dist2D > 0.0001) {
          const layerFade = 1 - cube.surfaceDepth * 0.5;
          const power =
            Math.pow(1 - dist2D / radius, 1.8) * strength * layerFade;
          tx = (dx / dist2D) * power;
          ty = (dy / dist2D) * power;
        }
      }
      const lerpSpeed = isIdle ? 0.06 : 0.12;
      return {
        x: displacements[i].x + (tx - displacements[i].x) * lerpSpeed,
        y: displacements[i].y + (ty - displacements[i].y) * lerpSpeed,
        z: displacements[i].z + (tz - displacements[i].z) * lerpSpeed,
      };
    });
  });
</script>

<T.PerspectiveCamera makeDefault fov={45} position={[0, 0.4, 5]} />

<T.AmbientLight intensity={0.4} />
<T.DirectionalLight position={[4, 6, 3]} intensity={1.8} color="#ffffff" />
<T.DirectionalLight position={[-3, 2, -4]} intensity={2.5} color={fillCol} />
<T.PointLight
  position={[0, 0, 0]}
  intensity={25}
  distance={10}
  color={coreCol}
/>

<!-- Main anchor group — floats as a whole, quaternion rotatable to any angle -->
<T.Group
  position.x={groupX}
  position.y={groupY + floatY}
  scale={groupScale}
  quaternion={[qx, qy, qz, qw]}
>
  {#each clones as clone, i (cubes[i].id)}
    <T.Group
      position.x={cubes[i].bx + displacements[i].x}
      position.y={cubes[i].by + displacements[i].y}
      position.z={cubes[i].bz + displacements[i].z}
      scale={CUBE_SCALE}
    >
      <T is={clone} />
    </T.Group>
  {/each}
</T.Group>
