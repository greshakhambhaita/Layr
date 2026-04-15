<script>
	import { Canvas } from "@threlte/core";
	import { onMount } from "svelte";
	import { fly } from "svelte/transition";
	import * as THREE from "three";
	import Scene from "./Scene.svelte";

	let mounted = $state(false);
	let baseCanvas, fxCanvas;

	onMount(() => {
		mounted = true;

		const base = baseCanvas;
		const fx = fxCanvas;
		const bCtx = base.getContext("2d");
		const fCtx = fx.getContext("2d");

		const CELL = 140;
		const GLOW_RADIUS = 160;
		const BORDER = 0.7;

		let W, H, cols, rows;
		let mouse = { x: -99999, y: -99999 };

		let ripple = null;
		let rippleTimer = 0;
		const RIPPLE_INTERVAL = 5000;
		let lastTs = 0;

		function resize() {
			W = window.innerWidth;
			H = window.innerHeight;
			base.width = fx.width = W;
			base.height = fx.height = H;
			cols = Math.ceil(W / CELL) + 2;
			rows = Math.ceil(H / CELL) + 2;
			drawBase();
		}

		function drawBase() {
			bCtx.clearRect(0, 0, W, H);
			bCtx.strokeStyle = "rgba(255,255,255,0.028)";
			bCtx.lineWidth = BORDER;
			for (let c = 0; c < cols; c++) {
				for (let r = 0; r < rows; r++) {
					bCtx.strokeRect(c * CELL + 0.5, r * CELL + 0.5, CELL, CELL);
				}
			}
		}

		function distFalloff(dist) {
			const t = Math.max(0, 1 - dist / GLOW_RADIUS);
			return t * t * (3 - 2 * t);
		}

		function drawSegmentSoft(x1, y1, x2, y2) {
			const dx = x2 - x1,
				dy = y2 - y1;
			const len = Math.sqrt(dx * dx + dy * dy);
			if (len < 1) return;

			const mx = mouse.x,
				my = mouse.y;
			const t = Math.max(
				0,
				Math.min(1, ((mx - x1) * dx + (my - y1) * dy) / (len * len)),
			);
			const closestX = x1 + t * dx;
			const closestY = y1 + t * dy;
			const closestDist = Math.hypot(mx - closestX, my - closestY);

			if (closestDist > GLOW_RADIUS) return;

			const d0 = Math.hypot(mx - x1, my - y1);
			const d1 = Math.hypot(mx - x2, my - y2);
			const dMid = Math.hypot(mx - (x1 + x2) / 2, my - (y1 + y2) / 2);

			const a0 = distFalloff(d0);
			const a1 = distFalloff(d1);
			const aMid = distFalloff(dMid);

			if (a0 + a1 + aMid < 0.001) return;

			const grad = fCtx.createLinearGradient(x1, y1, x2, y2);
			grad.addColorStop(0, `rgba(255,255,255,${a0})`);
			grad.addColorStop(0.5, `rgba(255,255,255,${aMid})`);
			grad.addColorStop(1, `rgba(255,255,255,${a1})`);

			fCtx.save();
			fCtx.strokeStyle = grad;
			fCtx.lineWidth = 18;
			fCtx.lineCap = "round";
			fCtx.globalAlpha = 0.07;
			fCtx.filter = "blur(6px)";
			fCtx.beginPath();
			fCtx.moveTo(x1, y1);
			fCtx.lineTo(x2, y2);
			fCtx.stroke();

			fCtx.filter = "none";
			fCtx.globalAlpha = 1;
			fCtx.strokeStyle = grad;
			fCtx.lineWidth = 4;
			fCtx.globalAlpha = 0.18;
			fCtx.beginPath();
			fCtx.moveTo(x1, y1);
			fCtx.lineTo(x2, y2);
			fCtx.stroke();

			fCtx.globalAlpha = 1;
			fCtx.strokeStyle = grad;
			fCtx.lineWidth = 0.9;
			fCtx.beginPath();
			fCtx.moveTo(x1, y1);
			fCtx.lineTo(x2, y2);
			fCtx.stroke();

			fCtx.restore();
		}

		function drawRippleRim(c, r, alpha) {
			const x = c * CELL + 0.5;
			const y = r * CELL + 0.5;
			fCtx.save();
			fCtx.strokeStyle = `rgba(255,255,255,${alpha})`;
			fCtx.lineWidth = BORDER;
			fCtx.shadowColor = `rgba(255,255,255,${Math.min(alpha * 4, 1)})`;
			fCtx.shadowBlur = 24;
			fCtx.strokeRect(x, y, CELL, CELL);
			fCtx.restore();
		}

		function startRipple() {
			const maxDist = Math.hypot(W, H);
			ripple = {
				ox: Math.floor(Math.random() * cols) * CELL + CELL / 2,
				oy: Math.floor(Math.random() * rows) * CELL + CELL / 2,
				maxDist,
				front: 0,
				speed: maxDist / 3400,
				width: CELL * 2.8,
			};
		}

		function rippleAlpha(dist) {
			if (!ripple) return 0;
			const tail = ripple.front - ripple.width;
			if (dist > ripple.front || dist < tail) return 0;
			const t = (dist - tail) / ripple.width;
			return Math.sin(t * Math.PI) * 0.25;
		}

		function tick(ts) {
			const dt = Math.min(ts - lastTs, 50);
			lastTs = ts;

			if (ripple) {
				ripple.front += ripple.speed * dt;
				if (ripple.front - ripple.width > ripple.maxDist) ripple = null;
			}

			rippleTimer += dt;
			if (rippleTimer >= RIPPLE_INTERVAL) {
				rippleTimer = 0;
				startRipple();
			}

			fCtx.clearRect(0, 0, W, H);

			const hcX = Math.floor(mouse.x / CELL);
			const hcY = Math.floor(mouse.y / CELL);
			const span = Math.ceil(GLOW_RADIUS / CELL) + 1;

			for (let c = hcX - span; c <= hcX + span; c++) {
				for (let r = hcY - span; r <= hcY + span; r++) {
					if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
					const x = c * CELL;
					const y = r * CELL;
					drawSegmentSoft(x, y, x + CELL, y);
					drawSegmentSoft(x, y + CELL, x + CELL, y + CELL);
					drawSegmentSoft(x, y, x, y + CELL);
					drawSegmentSoft(x + CELL, y, x + CELL, y + CELL);
				}
			}

			if (ripple) {
				for (let c = 0; c < cols; c++) {
					for (let r = 0; r < rows; r++) {
						const cx = c * CELL + CELL / 2;
						const cy = r * CELL + CELL / 2;
						const dist = Math.hypot(cx - ripple.ox, cy - ripple.oy);
						const a = rippleAlpha(dist);
						if (a > 0.003) drawRippleRim(c, r, a);
					}
				}
			}

			requestAnimationFrame(tick);
		}

		const handleMouseMove = (e) => {
			mouse.x = e.clientX;
			mouse.y = e.clientY;
		};
		const handleMouseLeave = () => {
			mouse.x = -99999;
			mouse.y = -99999;
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseleave", handleMouseLeave);
		window.addEventListener("resize", resize);

		resize();
		requestAnimationFrame((ts) => {
			lastTs = ts;
			tick(ts);
		});

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseleave", handleMouseLeave);
			window.removeEventListener("resize", resize);
		};
	});
</script>

<svelte:head>
	<title>Layr</title>
	<meta
		name="description"
		content="The most intuitive way to build professional bento-style layouts for your web projects."
	/>
</svelte:head>

<main
	class="relative min-h-screen flex flex-col items-center justify-center bg-black text-slate-50 overflow-hidden"
>
	<!-- Layer 0: base grid -->
	<canvas bind:this={baseCanvas} id="base"></canvas>

	<!-- Layer 1: mouse/ripple glow fx -->
	<canvas bind:this={fxCanvas} id="fx"></canvas>

	<!-- Layer 2: Threlte free-floating scene -->
	<div class="threlte-wrapper">
		<Canvas
			alpha={true}
			toneMapping={THREE.ACESFilmicToneMapping}
			toneMappingExposure={1.5}
		>
			<Scene />
		</Canvas>
	</div>

	<!-- Layer 3: hero text content — pointer-events-none so drags pass through to the canvas -->
	<div
		class="relative z-30 w-full min-h-screen flex items-center justify-center lg:justify-start max-w-7xl mx-auto px-6 pointer-events-none"
	>
		<div
			class="flex flex-col items-center lg:items-start text-center lg:text-left pointer-events-none w-full"
		>
			{#if mounted}
				<div
					class="flex flex-col items-center lg:items-start max-w-2xl"
					in:fly={{ y: 20, duration: 1000, delay: 600 }}
				>
					<h1
						class="font-prata text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight tracking-tight drop-shadow-2xl"
					>
						Design responsive bento grids visually
					</h1>
					<p
						class="font-sans text-lg md:text-xl text-slate-400 mb-12 max-w-xl font-light leading-relaxed"
					>
						Build, customize, and preview layouts across desktop, tablet, and
						mobile with the most intuitive grid builder.
					</p>

					<div
						class="flex flex-wrap items-center justify-center lg:justify-start gap-6 pointer-events-auto"
					>
						<a
							href="/playground"
							class="group relative px-10 py-5 bg-white text-black font-bold rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(255,255,255,0.15)] hover:shadow-[0_0_100px_rgba(255,255,255,0.3)] transition-all duration-700"
						>
							<span
								class="relative z-10 font-bold tracking-tight text-lg font-sans"
								>Launch Playground</span
							>
						</a>

						<a
							href="/templates"
							class="group relative px-10 py-5 border border-white/20 text-white font-bold rounded-2xl overflow-hidden transition-all duration-500 hover:text-black"
						>
							<span
								class="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"
							></span>
							<span
								class="relative z-10 font-bold tracking-tight text-lg font-sans"
								>Browse Templates</span
							>
						</a>
					</div>
				</div>
			{/if}
		</div>
	</div>
</main>

<style>
	:global(body) {
		background-color: #000;
		margin: 0;
		overflow: hidden;
	}

	canvas {
		position: fixed;
		inset: 0;
	}

	#base {
		z-index: 0;
	}

	#fx {
		z-index: 1;
		pointer-events: none;
	}

	.threlte-wrapper {
		position: fixed;
		inset: 0;
		z-index: 2;
		pointer-events: auto;
	}

	.threlte-wrapper :global(canvas) {
		position: absolute;
		inset: 0;
		width: 100% !important;
		height: 100% !important;
		background: transparent !important;
	}
</style>
