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
    intensity: 0.2,
    luminanceThreshold: 0.2,
    luminanceSmoothing: 0.6,
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

  const identityQuat = new THREE.Quaternion(); // (0, 0, 0, 1) — neutral orientation

  useTask(() => {
    const now = performance.now() / 1000;
    const idleForRotation = now - lastDragAt > 0.6; // grace period before returning

    if (idleForRotation) {
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

  $effect(() => {
    if (!$gltf) return;

    clones = cubes.map(() => {
      const clone = $gltf.scene.clone(true);
      clone.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color.set(0xffffff);
          child.material.transparent = true;
          child.material.opacity = 1.0; // ← 0.0 = invisible, 1.0 = fully opaque

          // Use EdgesGeometry instead of WireframeGeometry to remove diagonals
          const edgeGeo = new THREE.EdgesGeometry(child.geometry);
          const edges = new THREE.LineSegments(edgeGeo, borderMat);
          child.add(edges);
        }
      });
      return clone;
    });
  });

  // ─── Ripple Wave Effect ───────────────────────────────────────────────────
  // Instead of continuous repulsion, the cursor spawns an expanding ring.
  // As the ring sweeps through each surface cube, it briefly pushes it
  // outward and the cube springs back naturally via lerp toward zero.
  let displacements = $state(cubes.map(() => ({ x: 0, y: 0, z: 0 })));
  const mousePosition = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const worldMouse = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  // Active ripples pool
  const ripples = [];
  let lastRippleAt = 0;
  const RIPPLE_COOLDOWN = 0.15; // seconds between spawns (throttle)
  const RIPPLE_SPEED = 1.6; // units / second the ring expands
  const MAX_RADIUS = 2.2; // ring dies when it exceeds this
  const RING_WIDTH = 0.45; // half-width of the ripple ring
  const RIPPLE_STR = 0.3; // peak displacement magnitude
  const MAX_SURF_DEPTH = 1; // only outer 2 layers react

  $effect(() => {
    const handlePointerMove = (e) => {
      mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  });

  useTask((delta) => {
    if (!camera.current) return;

    const now = performance.now() / 1000;

    // Project cursor to grid-local XY plane
    raycaster.setFromCamera(mousePosition, camera.current);
    raycaster.ray.intersectPlane(plane, worldMouse);
    const anchor = new THREE.Vector3(1.4, 0.2, 0);
    const lm = worldMouse.clone().sub(anchor); // local mouse

    // Spawn a new ripple if cursor is near the grid and cooldown has passed
    const distToCenter = Math.sqrt(lm.x * lm.x + lm.y * lm.y);
    if (now - lastRippleAt > RIPPLE_COOLDOWN && distToCenter < MAX_RADIUS) {
      ripples.push({ ox: lm.x, oy: lm.y, radius: 0, age: 0 });
      lastRippleAt = now;
    }

    // Advance and prune ripples
    for (let r = ripples.length - 1; r >= 0; r--) {
      ripples[r].radius += RIPPLE_SPEED * delta;
      ripples[r].age += delta;
      if (ripples[r].radius - RING_WIDTH > MAX_RADIUS) {
        ripples.splice(r, 1);
      }
    }

    // Compute target displacement per surface cube from all active ripples
    for (let i = 0; i < cubes.length; i++) {
      const cube = cubes[i];
      let tx = 0,
        ty = 0;

      if (cube.surfaceDepth <= MAX_SURF_DEPTH) {
        for (const rip of ripples) {
          const dx = cube.bx - rip.ox;
          const dy = cube.by - rip.oy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.0001) continue;

          const ringDist = Math.abs(dist - rip.radius);
          if (ringDist < RING_WIDTH) {
            // sin envelope — peaks as ring edge passes the cube
            const t = 1 - ringDist / RING_WIDTH;
            // age-based fade: ring weakens as it gets larger
            const fade = Math.exp(-rip.age * 1.2);
            const push = Math.sin(t * Math.PI) * RIPPLE_STR * fade;
            // depth fade: second layer gets 60% of outer layer's push
            const layerFade = 1 - cube.surfaceDepth * 0.4;
            tx += (dx / dist) * push * layerFade;
            ty += (dy / dist) * push * layerFade;
          }
        }
      }

      // Lerp toward target (new ripple impulse or back to 0 when no ripple)
      displacements[i].x += (tx - displacements[i].x) * 0.2;
      displacements[i].y += (ty - displacements[i].y) * 0.2;
      displacements[i].z += (0 - displacements[i].z) * 0.2;
    }
  });
</script>

<T.PerspectiveCamera makeDefault fov={45} position={[0, 0.4, 5]} />

<T.AmbientLight intensity={0.5} />
<T.DirectionalLight position={[4, 6, 3]} intensity={1.2} color="#ffffff" />
<T.DirectionalLight position={[-3, 2, -4]} intensity={0.6} color="#ffffff" />

<!-- Main anchor group — floats as a whole, quaternion rotatable to any angle -->
<T.Group
  position.x={1.4}
  position.y={0.2 + floatY}
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
