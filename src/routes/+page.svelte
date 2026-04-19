<script>
	import Logo from "$lib/assets/p.svg";
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
	class="relative min-h-screen flex flex-col items-center justify-start bg-black text-white overflow-hidden"
>
	<!-- Hero Section Section -->
	<div class="relative w-full h-screen">
		<!-- Background layers (grid + glow) -->
		<canvas bind:this={baseCanvas} id="base" class="absolute inset-0"></canvas>
		<canvas bind:this={fxCanvas} id="fx" class="absolute inset-0"></canvas>

		<!-- Threlte scene (cube travels via scroll in Scene.svelte) -->
		<div
			class="threlte-wrapper absolute inset-0 h-screen z-10 pointer-events-auto"
		>
			<Canvas
				alpha={true}
				toneMapping={THREE.ACESFilmicToneMapping}
				toneMappingExposure={1.5}
			>
				<Scene />
			</Canvas>
		</div>

		<!-- Hero text content -->
		<div
			class="relative z-[100] w-full pt-20 flex flex-col items-center text-center px-3 pointer-events-none"
		>
			{#if mounted}
				<div
					class="flex flex-col items-center max-w-4xl"
					in:fly={{ y: -20, duration: 1000, delay: 400 }}
				>
					<h1
						class="font-jomolhari text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight tracking-tight drop-shadow-2xl"
					>
						Design responsive bento grids visually
					</h1>
					<p
						class="font-arimo text-xl md:text-2xl max-w-3xl font-light leading-relaxed mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent"
					>
						Create, customize, and export grid systems with zero friction.
					</p>
				</div>
			{/if}
		</div>

		<!-- CTA Buttons -->
		{#if mounted}
			<div
				class="absolute bottom-8 lg:bottom-12 left-1/2 -translate-x-1/2 z-[110] flex flex-col md:flex-row items-center gap-4 md:gap-8 pointer-events-none w-[calc(100%-48px)] md:w-auto"
				in:fly={{ y: 30, duration: 1200, delay: 1000 }}
			>
				<a
					href="/templates"
					class="group relative w-full md:w-auto px-10 py-4 overflow-hidden rounded-full bg-white text-black font-arimo text-[10px] md:text-xs uppercase tracking-[0.25em] transition-all hover:bg-neutral-200 active:scale-95 pointer-events-auto text-center"
				>
					<span class="relative z-10">Browse Templates</span>
				</a>

				<a
					href="/playground"
					class="group relative w-full md:w-auto px-10 py-4 overflow-hidden rounded-full border border-white/10 bg-black/40 backdrop-blur-md font-arimo text-[10px] md:text-xs uppercase tracking-[0.25em] transition-all hover:border-white/40 hover:bg-white/10 active:scale-95 pointer-events-auto text-center"
				>
					<div
						class="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
					></div>
					<span class="relative z-10 text-white">Launch Playground</span>

					<!-- Subtle glow effect -->
					<div
						class="absolute -inset-px rounded-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity"
					></div>
				</a>
			</div>
		{/if}
	</div>

	<!-- Secondary Content Section (Below the fold) -->
	<div
		class="relative z-[10] w-full pt-24 pb-24 px-12 md:px-24 flex flex-col items-center"
	>
		<div
			class="w-full max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left"
		>
			<div class="flex flex-col gap-4 border-l border-white/5 pl-6">
				<span
					class="text-[9px] uppercase tracking-[0.4em] text-white/60 font-bold"
					>Protocol 01</span
				>
				<h4 class="text-xl font-jomolhari">Fully Responsive</h4>
				<p
					class="text-[10px] text-white/30 leading-relaxed font-light tracking-wide uppercase"
				>
					Multi-breakpoint support for Desktop, Tablet, and Mobile devices.
				</p>
			</div>
			<div class="flex flex-col gap-4 border-l border-white/5 pl-6">
				<span
					class="text-[9px] uppercase tracking-[0.4em] text-white/60 font-bold"
					>Protocol 02</span
				>
				<h4 class="text-xl font-jomolhari">Live Editing</h4>
				<p
					class="text-[10px] text-white/30 leading-relaxed font-light tracking-wide uppercase"
				>
					Real-time preview with high-performance CSS grid engine.
				</p>
			</div>
			<div class="flex flex-col gap-4 border-l border-white/5 pl-6">
				<span
					class="text-[9px] uppercase tracking-[0.4em] text-white/60 font-bold"
					>Protocol 03</span
				>
				<h4 class="text-xl font-jomolhari">Code Export</h4>
				<p
					class="text-[10px] text-white/30 leading-relaxed font-light tracking-wide uppercase"
				>
					Production-ready Svelte and React component generation.
				</p>
			</div>
			<div class="flex flex-col gap-4 border-l border-white/5 pl-6">
				<span
					class="text-[9px] uppercase tracking-[0.4em] text-white/60 font-bold"
					>Protocol 04</span
				>
				<h4 class="text-xl font-jomolhari">High Density</h4>
				<p
					class="text-[10px] text-white/30 leading-relaxed font-light tracking-wide uppercase"
				>
					Efficient layout management for complex content matrices.
				</p>
			</div>
		</div>

		<!-- Footer -->
		<footer
			class="w-full mt-48 border-t-2 border-white/20 pt-16 pb-20 flex flex-col md:flex-row justify-between items-start gap-20"
		>
			<div class="flex flex-col gap-8">
				<div class="flex items-center gap-5 opacity-100">
					<img src={Logo} alt="" class="h-8 invert" />
					<div class="h-6 w-[1px] bg-white/40"></div>
					<span
						class="text-base font-jomolhari uppercase tracking-[0.5em] font-black"
						>Bento Grid Engine</span
					>
				</div>
				<p
					class="text-base text-white/60 font-light max-w-sm leading-relaxed uppercase tracking-[0.2em]"
				>
					Designed for modern designers and engineers building the future of the
					web.
				</p>
			</div>
			<div class="flex gap-24 text-white/50">
				<div class="flex flex-col gap-6">
					<span
						class="text-xs uppercase tracking-[0.4em] font-black text-white/90"
						>Engine</span
					>
					<div class="flex flex-col gap-4">
						<a
							href="/templates"
							class="text-[11px] uppercase tracking-[0.2em] hover:text-white transition-colors"
							>Core Patterns</a
						>
						<a
							href="/playground"
							class="text-[11px] uppercase tracking-[0.2em] hover:text-white transition-colors"
							>Interactive Editor</a
						>
					</div>
				</div>
				<div class="flex flex-col gap-6">
					<span
						class="text-xs uppercase tracking-[0.4em] font-black text-white/90"
						>Project</span
					>
					<div class="flex flex-col gap-4">
						<a
							href="/"
							class="text-[11px] uppercase tracking-[0.2em] hover:text-white transition-colors"
							>GitHub Repository</a
						>
					</div>
				</div>
			</div>
		</footer>
	</div>
</main>

<style>
	:global(body) {
		background-color: #000;
		margin: 0;
		overflow-x: hidden;
		overflow-y: auto;
	}

	:global(body)::-webkit-scrollbar {
		width: 4px;
	}
	:global(body)::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
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
		position: absolute;
		inset: 0;
		height: 100vh;
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
