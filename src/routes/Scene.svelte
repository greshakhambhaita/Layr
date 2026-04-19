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
    intensity: 0.8,
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
  const CUBE_SCALE = 0.13;
  const GAP = 0.35;

  const cubes = [];
  for (let z = 0; z < DEPTH; z++) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
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

  const borderMat = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });

  let clones = $state([]);
  let wireframes = $state([]);

  // ─── Free drag rotation ───────────────────────────────────────────────────
  const rotationQuat = new THREE.Quaternion();
  const targetQuat = new THREE.Quaternion();
  let isDragging = false;
  let previousX = 0;
  let previousY = 0;
  let lastDragAt = 0;

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
  const baseTilt = new THREE.Euler(0.2, 0.4, 0);

  useTask(() => {
    const now = performance.now() / 1000;
    const idleForRotation = now - lastDragAt > 0.6;

    if (idleForRotation) {
      baseYaw += 0.002;
      identityQuat.setFromEuler(
        new THREE.Euler(baseTilt.x, baseYaw, baseTilt.z),
      );
      targetQuat.slerp(identityQuat, 0.045);
    }

    rotationQuat.slerp(targetQuat, 0.1);
    qx = rotationQuat.x;
    qy = rotationQuat.y;
    qz = rotationQuat.z;
    qw = rotationQuat.w;
  });

  // ─── Floating animation ───────────────────────────────────────────────────
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

  const startFill = new THREE.Color("#4488ff");
  const endFill = new THREE.Color("#ff44bb");
  const startCore = new THREE.Color("#ffaa55");
  const endCore = new THREE.Color("#ffccaa");

  useTask((delta) => {
    colorCycleTime += delta * 0.5;
    const t = (Math.sin(colorCycleTime) + 1) / 2;

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
          child.material.emissive.set(0x333333);
          child.material.emissiveIntensity = 2.0;

          const edgeGeo = new THREE.EdgesGeometry(child.geometry);
          const edges = new THREE.LineSegments(edgeGeo, borderMat);
          child.add(edges);
        }
      });
      return clone;
    });
  });

  // ─── Interactive Repulsion ────────────────────────────────────────────────
  let displacements = $state(cubes.map(() => ({ x: 0, y: 0, z: 0 })));
  const mousePosition = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const worldMouse = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  let lastMouseMoveAt = 0;
  const IDLE_RETURN_DELAY = 0.4;

  $effect(() => {
    const updateMouse = (e) => {
      mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
      lastMouseMoveAt = performance.now() / 1000;
    };
    window.addEventListener("pointermove", updateMouse);
    return () => window.removeEventListener("pointermove", updateMouse);
  });

  // ─── Responsive Positioning ───────────────────────────────────────────────
  let groupScale = $derived(
    $size.width < 640
      ? 0.6 // mobile
      : $size.width < 1024
        ? 0.88 // tablet: closer to desktop size
        : 1.0, // desktop: original
  );

  let currentGroupX = $derived(0);
  let currentGroupY = $derived(
    $size.width < 640
      ? -0.6 // mobile
      : -0.29, // tablet + desktop: original
  );

  useTask(() => {
    if (!camera.current) return;

    const now = performance.now() / 1000;
    const isIdle = now - lastMouseMoveAt > IDLE_RETURN_DELAY;

    raycaster.setFromCamera(mousePosition, camera.current);
    raycaster.ray.intersectPlane(plane, worldMouse);

    const anchor = new THREE.Vector3(currentGroupX, currentGroupY, 0);
    const localMouse = worldMouse.clone().sub(anchor);

    const radius = 1.2;
    const strength = 0.8;
    const MAX_SURFACE_DEPTH = 1;

    displacements = cubes.map((cube, i) => {
      let tx = 0,
        ty = 0,
        tz = 0;

      if (!isIdle && cube.surfaceDepth <= MAX_SURFACE_DEPTH) {
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

<!-- Main anchor group -->
<T.Group
  position.x={currentGroupX}
  position.y={currentGroupY + floatY}
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
