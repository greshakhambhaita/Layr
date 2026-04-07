<script>
	import { onMount } from "svelte";
	import { fly, fade } from "svelte/transition";
	import { goto } from "$app/navigation";

	let mounted = $state(false);
	let baseCanvas, fxCanvas;

	const templates = [
		{
			name: "Modern Bento Portfolio",
			description: "Classic 18x10 high-density layout",
			numCols: 9, numRows: 5, gridWidth: 700, gridGap: 12, cellRadius: 12, aspectRatio: "600 / 328", internalCols: 18, internalRows: 10,
			cells: [
				{ id: 'i', r: 0, c: 0,  colSpan: 6, rowSpan: 3  },
				{ id: 'j', r: 0, c: 6,  colSpan: 6, rowSpan: 2  },
				{ id: 'k', r: 0, c: 12, colSpan: 6, rowSpan: 7  },
				{ id: 'l', r: 7, c: 12, colSpan: 6, rowSpan: 3  },
				{ id: 'm', r: 8, c: 6,  colSpan: 6, rowSpan: 2  },
				{ id: 'n', r: 2, c: 6,  colSpan: 6, rowSpan: 6  },
				{ id: 'o', r: 3, c: 0,  colSpan: 6, rowSpan: 7  },
			]
		},
		{
			name: "Minimalist Grid",
			description: "Compact 10x6 balanced structure",
			numCols: 5, numRows: 3, gridWidth: 600, gridGap: 7, cellRadius: 8, aspectRatio: "600 / 357", internalCols: 10, internalRows: 6,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 4, rowSpan: 2 },
				{ id: 'd', r: 4, c: 0, colSpan: 4, rowSpan: 2 },
				{ id: 'g', r: 4, c: 7, colSpan: 1, rowSpan: 2 },
				{ id: 'h', r: 2, c: 2, colSpan: 3, rowSpan: 2 },
				{ id: 'b', r: 0, c: 4, colSpan: 2, rowSpan: 2 },
				{ id: 'c', r: 2, c: 0, colSpan: 2, rowSpan: 2 },
				{ id: 'e', r: 4, c: 4, colSpan: 3, rowSpan: 2 },
				{ id: 'f', r: 0, c: 6, colSpan: 2, rowSpan: 2 },
				{ id: 'm', r: 2, c: 8, colSpan: 2, rowSpan: 2 },
				{ id: 'i', r: 0, c: 8, colSpan: 1, rowSpan: 1 },
				{ id: 'j', r: 0, c: 9, colSpan: 1, rowSpan: 1 },
				{ id: 'k', r: 1, c: 8, colSpan: 1, rowSpan: 1 },
				{ id: 'l', r: 1, c: 9, colSpan: 1, rowSpan: 1 },
				{ id: 'n', r: 2, c: 5, colSpan: 3, rowSpan: 2 },
				{ id: 'o', r: 4, c: 8, colSpan: 2, rowSpan: 2 },
			]
		},
		{
			name: "Creative Showcase",
			description: "Tall 12x8 media-first layout",
			numCols: 6, numRows: 4, gridWidth: 700, gridGap: 14, cellRadius: 16, aspectRatio: "700 / 466", internalCols: 12, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 4, rowSpan: 8 },
				{ id: 'b', r: 0, c: 4, colSpan: 8, rowSpan: 4, textElements: [{ text: 'VISUALS', x: 50, y: 50, fontSize: 32, fontWeight: 700, fontFamily: 'Outfit', color: '#000000', opacity: 0.1, rotation: 0, scale: 1 }] },
				{ id: 'c', r: 4, c: 4, colSpan: 4, rowSpan: 4 },
				{ id: 'd', r: 4, c: 8, colSpan: 4, rowSpan: 4 },
			]
		},
		{
			name: "Editorial Layout",
			description: "Asymmetric 16x12 professional grid",
			numCols: 8, numRows: 6, gridWidth: 800, gridGap: 10, cellRadius: 4, aspectRatio: "800 / 600", internalCols: 16, internalRows: 12,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 10, rowSpan: 6 },
				{ id: 'b', r: 0, c: 10, colSpan: 6, rowSpan: 3 },
				{ id: 'c', r: 3, c: 10, colSpan: 6, rowSpan: 3 },
				{ id: 'd', r: 6, c: 0, colSpan: 5, rowSpan: 6 },
				{ id: 'e', r: 6, c: 5, colSpan: 5, rowSpan: 6 },
				{ id: 'f', r: 6, c: 10, colSpan: 6, rowSpan: 6 },
			]
		},
		{
			name: "Feature Matrix",
			description: "High-density 8x8 functional grid",
			numCols: 4, numRows: 4, gridWidth: 600, gridGap: 8, cellRadius: 12, aspectRatio: "600 / 600", internalCols: 8, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 2, rowSpan: 2 },
				{ id: 'b', r: 0, c: 2, colSpan: 2, rowSpan: 2 },
				{ id: 'c', r: 0, c: 4, colSpan: 2, rowSpan: 2 },
				{ id: 'd', r: 0, c: 6, colSpan: 2, rowSpan: 2 },
				{ id: 'e', r: 2, c: 0, colSpan: 4, rowSpan: 4 },
				{ id: 'f', r: 2, c: 4, colSpan: 4, rowSpan: 2 },
				{ id: 'g', r: 4, c: 4, colSpan: 2, rowSpan: 2 },
				{ id: 'h', r: 4, c: 6, colSpan: 2, rowSpan: 2 },
				{ id: 'i', r: 6, c: 0, colSpan: 8, rowSpan: 2 },
			]
		},
		{
			name: "Vertical Portfolio",
			description: "Sleek 6x12 portrait-oriented grid",
			numCols: 3, numRows: 6, gridWidth: 500, gridGap: 12, cellRadius: 20, aspectRatio: "500 / 800", internalCols: 6, internalRows: 12,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 6, rowSpan: 3 },
				{ id: 'b', r: 3, c: 0, colSpan: 3, rowSpan: 3 },
				{ id: 'c', r: 3, c: 3, colSpan: 3, rowSpan: 3 },
				{ id: 'd', r: 6, c: 0, colSpan: 3, rowSpan: 6 },
				{ id: 'e', r: 6, c: 3, colSpan: 3, rowSpan: 3 },
				{ id: 'f', r: 9, c: 3, colSpan: 3, rowSpan: 3 },
			]
		},
		{
			name: "Split Perspective",
			description: "Symmetrical 12x8 dual-feature layout",
			numCols: 6, numRows: 4, gridWidth: 700, gridGap: 14, cellRadius: 16, aspectRatio: "700 / 466", internalCols: 12, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 6, rowSpan: 8 },
				{ id: 'b', r: 0, c: 6, colSpan: 6, rowSpan: 8 },
			]
		},
		{
			name: "Corner Focus",
			description: "Hierarchical 12x8 corner-weighted grid",
			numCols: 6, numRows: 4, gridWidth: 700, gridGap: 12, cellRadius: 12, aspectRatio: "700 / 466", internalCols: 12, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 8, rowSpan: 6 },
				{ id: 'b', r: 6, c: 0, colSpan: 4, rowSpan: 2 },
				{ id: 'c', r: 6, c: 4, colSpan: 4, rowSpan: 2 },
				{ id: 'd', r: 0, c: 8, colSpan: 4, rowSpan: 3 },
				{ id: 'e', r: 3, c: 8, colSpan: 4, rowSpan: 3 },
				{ id: 'f', r: 6, c: 8, colSpan: 4, rowSpan: 2 },
			]
		},
		{
			name: "Zig Zag Flow",
			description: "Alternating 16x8 dynamic sequence",
			numCols: 8, numRows: 4, gridWidth: 800, gridGap: 10, cellRadius: 8, aspectRatio: "800 / 400", internalCols: 16, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 4, rowSpan: 4 },
				{ id: 'b', r: 0, c: 4, colSpan: 12, rowSpan: 4 },
				{ id: 'c', r: 4, c: 0, colSpan: 12, rowSpan: 4 },
				{ id: 'd', r: 4, c: 12, colSpan: 4, rowSpan: 4 },
			]
		},
		{
			name: "The Spiral",
			description: "Approximate 20x12 golden ratio grid",
			numCols: 10, numRows: 6, gridWidth: 800, gridGap: 8, cellRadius: 12, aspectRatio: "800 / 480", internalCols: 20, internalRows: 12,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 12, rowSpan: 12 },
				{ id: 'b', r: 0, c: 12, colSpan: 8, rowSpan: 7 },
				{ id: 'c', r: 7, c: 12, colSpan: 5, rowSpan: 5 },
				{ id: 'd', r: 7, c: 17, colSpan: 3, rowSpan: 3 },
				{ id: 'e', r: 10, c: 17, colSpan: 3, rowSpan: 2 },
			]
		},
		{
			name: "Panorama Showcase",
			description: "Ultra-wide 24x8 cinematic layout",
			numCols: 12, numRows: 4, gridWidth: 900, gridGap: 8, cellRadius: 6, aspectRatio: "900 / 300", internalCols: 24, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 16, rowSpan: 8 },
				{ id: 'b', r: 0, c: 16, colSpan: 8, rowSpan: 4 },
				{ id: 'c', r: 4, c: 16, colSpan: 4, rowSpan: 4 },
				{ id: 'd', r: 4, c: 20, colSpan: 4, rowSpan: 4 },
			]
		},
		{
			name: "Radial Matrix",
			description: "Centered 16x16 symmetrical pattern",
			numCols: 8, numRows: 8, gridWidth: 600, gridGap: 6, cellRadius: 100, aspectRatio: "600 / 600", internalCols: 16, internalRows: 16,
			cells: [
				{ id: 'a', r: 4, c: 4, colSpan: 8, rowSpan: 8 },
				{ id: 'b', r: 0, c: 0, colSpan: 4, rowSpan: 4 },
				{ id: 'c', r: 0, c: 12, colSpan: 4, rowSpan: 4 },
				{ id: 'd', r: 12, c: 0, colSpan: 4, rowSpan: 4 },
				{ id: 'e', r: 12, c: 12, colSpan: 4, rowSpan: 4 },
				{ id: 'f', r: 0, c: 4, colSpan: 8, rowSpan: 4 },
				{ id: 'g', r: 12, c: 4, colSpan: 8, rowSpan: 4 },
				{ id: 'h', r: 4, c: 0, colSpan: 4, rowSpan: 8 },
				{ id: 'i', r: 4, c: 12, colSpan: 4, rowSpan: 8 },
			]
		},
		{
			name: "Classic 3-Column",
			description: "Simple 6x4 balanced triptych",
			numCols: 3, numRows: 2, gridWidth: 600, gridGap: 16, cellRadius: 10, aspectRatio: "600 / 400", internalCols: 6, internalRows: 4,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 2, rowSpan: 4 },
				{ id: 'b', r: 0, c: 2, colSpan: 2, rowSpan: 4 },
				{ id: 'c', r: 0, c: 4, colSpan: 2, rowSpan: 4 },
			]
		},
		{
			name: "Hero Banner",
			description: "Cinematic 12x8 feature-heavy layout",
			numCols: 6, numRows: 4, gridWidth: 700, gridGap: 14, cellRadius: 12, aspectRatio: "700 / 466", internalCols: 12, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 12, rowSpan: 3 },
				{ id: 'b', r: 3, c: 0, colSpan: 4, rowSpan: 5 },
				{ id: 'c', r: 3, c: 4, colSpan: 4, rowSpan: 5 },
				{ id: 'd', r: 3, c: 8, colSpan: 4, rowSpan: 5 },
			]
		},
		{
			name: "Staggered Gallery",
			description: "Dynamic 8x8 masonry-inspired grid",
			numCols: 4, numRows: 4, gridWidth: 600, gridGap: 10, cellRadius: 16, aspectRatio: "600 / 600", internalCols: 8, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 4, rowSpan: 2 },
				{ id: 'b', r: 0, c: 4, colSpan: 4, rowSpan: 4 },
				{ id: 'c', r: 2, c: 0, colSpan: 4, rowSpan: 6 },
				{ id: 'd', r: 4, c: 4, colSpan: 4, rowSpan: 4 },
			]
		},
		{
			name: "Analytics Dashboard",
			description: "Info-dense 12x8 administrative interface",
			numCols: 6, numRows: 4, gridWidth: 800, gridGap: 8, cellRadius: 4, aspectRatio: "800 / 500", internalCols: 12, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 3, rowSpan: 2 },
				{ id: 'b', r: 0, c: 3, colSpan: 3, rowSpan: 2 },
				{ id: 'c', r: 0, c: 6, colSpan: 3, rowSpan: 2 },
				{ id: 'd', r: 0, c: 9, colSpan: 3, rowSpan: 2 },
				{ id: 'e', r: 2, c: 0, colSpan: 8, rowSpan: 6 },
				{ id: 'f', r: 2, c: 8, colSpan: 4, rowSpan: 3 },
				{ id: 'g', r: 5, c: 8, colSpan: 4, rowSpan: 3 },
			]
		},
		{
			name: "Center Stage",
			description: "Symmetrical 10x10 focus layout",
			numCols: 5, numRows: 5, gridWidth: 600, gridGap: 8, cellRadius: 12, aspectRatio: "600 / 600", internalCols: 10, internalRows: 10,
			cells: [
				{ id: 'a', r: 2, c: 2, colSpan: 6, rowSpan: 6 },
				{ id: 'b', r: 0, c: 0, colSpan: 2, rowSpan: 2 },
				{ id: 'c', r: 0, c: 8, colSpan: 2, rowSpan: 2 },
				{ id: 'd', r: 8, c: 0, colSpan: 2, rowSpan: 2 },
				{ id: 'e', r: 8, c: 8, colSpan: 2, rowSpan: 2 },
				{ id: 'f', r: 0, c: 2, colSpan: 6, rowSpan: 2 },
				{ id: 'g', r: 8, c: 2, colSpan: 6, rowSpan: 2 },
				{ id: 'h', r: 2, c: 0, colSpan: 2, rowSpan: 6 },
				{ id: 'i', r: 2, c: 8, colSpan: 2, rowSpan: 6 },
			]
		},
		{
			name: "Horizontal Stripe",
			description: "Impactful 12x6 billboard pattern",
			numCols: 6, numRows: 3, gridWidth: 800, gridGap: 12, cellRadius: 10, aspectRatio: "800 / 400", internalCols: 12, internalRows: 6,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 4, rowSpan: 2 },
				{ id: 'b', r: 0, c: 4, colSpan: 4, rowSpan: 2 },
				{ id: 'c', r: 0, c: 8, colSpan: 4, rowSpan: 2 },
				{ id: 'd', r: 2, c: 0, colSpan: 12, rowSpan: 2 },
				{ id: 'e', r: 4, c: 0, colSpan: 6, rowSpan: 2 },
				{ id: 'f', r: 4, c: 6, colSpan: 6, rowSpan: 2 },
			]
		},
		{
			name: "The Tower",
			description: "Vertical 6x12 center-weighted grid",
			numCols: 3, numRows: 6, gridWidth: 500, gridGap: 12, cellRadius: 20, aspectRatio: "500 / 800", internalCols: 6, internalRows: 12,
			cells: [
				{ id: 'a', r: 0, c: 2, colSpan: 2, rowSpan: 12 },
				{ id: 'b', r: 0, c: 0, colSpan: 2, rowSpan: 4 },
				{ id: 'c', r: 4, c: 0, colSpan: 2, rowSpan: 4 },
				{ id: 'd', r: 8, c: 0, colSpan: 2, rowSpan: 4 },
				{ id: 'e', r: 0, c: 4, colSpan: 2, rowSpan: 6 },
				{ id: 'f', r: 6, c: 4, colSpan: 2, rowSpan: 6 },
			]
		},
		{
			name: "70/30 Modern",
			description: "Professional 16x8 asymmetric paired grid",
			numCols: 8, numRows: 4, gridWidth: 800, gridGap: 14, cellRadius: 6, aspectRatio: "800 / 400", internalCols: 16, internalRows: 8,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 11, rowSpan: 8 },
				{ id: 'b', r: 0, c: 11, colSpan: 5, rowSpan: 4 },
				{ id: 'c', r: 4, c: 11, colSpan: 5, rowSpan: 4 },
			]
		},
		{
			name: "Intersection",
			description: "Geometric 8x8 cross-pattern layout",
			numCols: 4, numRows: 4, gridWidth: 600, gridGap: 10, cellRadius: 12, aspectRatio: "600 / 600", internalCols: 8, internalRows: 8,
			cells: [
				{ id: 'a', r: 3, c: 0, colSpan: 8, rowSpan: 2 },
				{ id: 'b', r: 0, c: 3, colSpan: 2, rowSpan: 8 },
				{ id: 'c', r: 0, c: 0, colSpan: 3, rowSpan: 3 },
				{ id: 'd', r: 0, c: 5, colSpan: 3, rowSpan: 3 },
				{ id: 'e', r: 5, c: 0, colSpan: 3, rowSpan: 3 },
				{ id: 'f', r: 5, c: 5, colSpan: 3, rowSpan: 3 },
			]
		},
		{
			name: "The Mosaic",
			description: "Artistic 10x10 high-density patchwork",
			numCols: 5, numRows: 5, gridWidth: 700, gridGap: 6, cellRadius: 8, aspectRatio: "700 / 700", internalCols: 10, internalRows: 10,
			cells: [
				{ id: 'a', r: 0, c: 0, colSpan: 2, rowSpan: 2 },
				{ id: 'b', r: 0, c: 2, colSpan: 4, rowSpan: 4 },
				{ id: 'c', r: 0, c: 6, colSpan: 2, rowSpan: 2 },
				{ id: 'd', r: 0, c: 8, colSpan: 2, rowSpan: 2 },
				{ id: 'e', r: 2, c: 0, colSpan: 2, rowSpan: 4 },
				{ id: 'f', r: 4, c: 2, colSpan: 2, rowSpan: 2 },
				{ id: 'g', r: 4, c: 4, colSpan: 4, rowSpan: 4 },
				{ id: 'h', r: 2, c: 6, colSpan: 2, rowSpan: 2 },
				{ id: 'i', r: 2, c: 8, colSpan: 2, rowSpan: 4 },
				{ id: 'j', r: 6, c: 0, colSpan: 4, rowSpan: 4 },
				{ id: 'k', r: 6, c: 8, colSpan: 2, rowSpan: 2 },
				{ id: 'l', r: 8, c: 4, colSpan: 4, rowSpan: 2 },
			]
		}
	];

	// Process all templates for the list view
	const allTemplates = $derived(templates.map(t => ({
		...t,
		processedCells: t.cells.map(cell => ({
			hex: '#d9d9d9',
			opacity: 1,
			type: 'color',
			imageUrl: '',
			imageStyle: { fit: 'cover', position: 'center', scale: 1 },
			clipPath: '',
			textElements: [],
			...cell,
			gridArea: `${cell.r + 1} / ${cell.c + 1} / ${cell.r + 1 + cell.rowSpan} / ${cell.c + 1 + cell.colSpan}`,
		}))
	})));

	const handleSelectTemplate = (template) => {
		const savedTemplate = {
			numCols: template.numCols,
			numRows: template.numRows,
			gridWidth: template.gridWidth,
			gridGap: template.gridGap,
			cellRadius: template.cellRadius,
			cells: template.cells
		};
		localStorage.setItem('bento-template', JSON.stringify(savedTemplate));
		goto('/playground');
	};

	onMount(() => {
		mounted = true;

		const base = baseCanvas;
		const fx = fxCanvas;
		const bCtx = base.getContext("2d");
		const fCtx = fx.getContext("2d");

		const CELL = 140;
		const BORDER = 0.7;

		let W, H, cols, rows;
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

		window.addEventListener("resize", resize);
		resize();
		
		requestAnimationFrame((ts) => {
			lastTs = ts;
			tick(ts);
		});

		return () => {
			window.removeEventListener("resize", resize);
		};
	});

	// Google Fonts loader
	$effect(() => {
		const loaded = new Set();
		allTemplates.forEach(template => {
			template.processedCells.forEach(cell => {
				cell.textElements?.forEach(t => {
					if (loaded.has(t.fontFamily)) return;
					loaded.add(t.fontFamily);
					const linkId = `font-${t.fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
					if (!document.getElementById(linkId)) {
						const link = document.createElement('link');
						link.id = linkId;
						link.rel = 'stylesheet';
						link.href = `https://fonts.googleapis.com/css2?family=${t.fontFamily.replace(/\s+/g, '+')}:wght@400;600;700&display=swap`;
						document.head.appendChild(link);
					}
				});
			});
		});
	});
</script>

<svelte:head>
	<title>Templates | Bento Grid Builder</title>
</svelte:head>

<main class="min-h-screen w-full bg-black text-white font-sans overflow-x-hidden relative">
	<!-- Ambient Grid Canvas -->
	<canvas bind:this={baseCanvas} id="base"></canvas>
	<canvas bind:this={fxCanvas} id="fx"></canvas>

	{#if mounted}
		<div class="relative z-10">
		<!-- Header -->
		<header class="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10 p-8 md:p-12">
			<div class="w-full flex justify-between items-end">
				<div class="flex flex-col gap-1" in:fly={{ y: -20, duration: 800 }}>
					<h1 class="text-3xl md:text-4xl font-prata tracking-tight">Gallery</h1>
					<p class="text-white/40 font-light text-sm md:text-base">A collection of 22 curated bento patterns.</p>
				</div>
				<a href="/" class="text-white/40 hover:text-white transition-colors text-xs md:text-sm uppercase tracking-widest font-sans" in:fade={{ delay: 400 }}>
					&larr; Home
				</a>
			</div>
		</header>

		<!-- Table Grid -->
		<div class="pt-[160px] md:pt-[180px] w-full grid grid-cols-1 md:grid-cols-2 border-t border-white/10">
			{#each allTemplates as template, i}
				<div 
					class="border-b border-white/10 {i % 2 === 0 ? 'md:border-r' : ''} p-8 md:p-16 flex flex-col gap-12 group transition-colors hover:bg-white/[0.02]"
					in:fade={{ delay: (i % 6) * 50 }}
				>
					<!-- Header Info -->
					<div class="flex justify-between items-start">
						<div class="flex flex-col gap-2">
							<span class="text-white/20 text-[10px] uppercase tracking-[0.2em]">P-{String(i + 1).padStart(2, '0')}</span>
							<h3 class="text-white font-sans text-2xl font-medium tracking-tight group-hover:text-white transition-colors">{template.name}</h3>
							<p class="text-white/40 text-sm font-sans tracking-tight">{template.description}</p>
						</div>
						<button 
							onclick={() => handleSelectTemplate(template)}
							class="px-4 py-2 border border-white/10 text-white/40 text-[10px] font-bold rounded uppercase tracking-widest hover:border-white/30 hover:text-white transition-all whitespace-nowrap"
						>
							Select
						</button>
					</div>

					<!-- Visual Preview Area -->
					<div class="flex-1 w-full flex items-center justify-center min-h-[400px] pointer-events-none">
						<div class="bento-grid-wrapper w-full flex items-center justify-center scale-90 md:scale-[0.75]">
							<div 
								class="bento-grid relative z-10 w-full"
								style="
									--grid-cols: {template.internalCols};
									--grid-rows: {template.internalRows};
									--grid-gap: {template.gridGap}px;
									--grid-radius: {template.cellRadius}px;
									--grid-aspect: {template.aspectRatio};
								"
							>
								{#each template.processedCells as cell (cell.id)}
									<div
										class="bento-cell bento-cell-{cell.id}"
										style="
											grid-area: {cell.gridArea};
											--cell-bg: {cell.hex};
											--cell-opacity: {cell.opacity};
											{cell.clipPath ? `clip-path: ${cell.clipPath};` : ''}
										"
									>
										{#if cell.type === 'image' && cell.imageUrl}
											<img
												src={cell.imageUrl}
												alt=""
												style="
													object-fit: {cell.imageStyle.fit};
													object-position: {cell.imageStyle.position};
													transform: scale({cell.imageStyle.scale});
												"
											/>
										{/if}

										{#if cell.textElements?.length > 0}
											<div class="bento-text-layer">
												{#each cell.textElements as text}
													<div
														style="
															position: absolute;
															left: {text.x}%;
															top: {text.y}%;
															transform: translate(-50%, -50%) rotate({text.rotation}deg) scale({text.scale});
															font-family: '{text.fontFamily}', sans-serif;
															font-size: {text.fontSize}px;
															font-weight: {text.fontWeight};
															color: {text.color};
															opacity: {text.opacity};
															text-align: {text.textAlign};
															white-space: nowrap;
														"
													>
														{text.text}
													</div>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Footer Metadata -->
					<div class="mt-auto flex justify-between items-center pt-8 border-t border-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
						<span class="text-white/20 text-[10px] uppercase tracking-widest">{template.numCols * 2} Resolution Columns</span>
						<div class="flex gap-2">
							{#each [1, 2, 3] as _}
								<div class="w-1 h-1 rounded-full bg-white/10"></div>
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>
		</div>
	{/if}
</main>

<style>
  :global(body) {
    overflow: auto !important;
    background-color: #000;
  }

  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* ── Grid ─────────────────────────────────── */
  .bento-grid {
    display: grid;
    gap: var(--grid-gap, 12px);
    padding: 10px;
    box-sizing: border-box;
    width: 100%;
    max-width: 900px;
    max-height: 60vh;
    aspect-ratio: var(--grid-aspect, 600 / 328);
    grid-template-columns: repeat(var(--grid-cols, 18), 1fr);
    grid-template-rows: repeat(var(--grid-rows, 10), 1fr);
    margin: auto;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    border-radius: 20px;
  }

  canvas {
    position: fixed;
    inset: 0;
    pointer-events: none;
  }

  #base {
    z-index: 0;
  }

  #fx {
    z-index: 1;
  }

  /* ── Cell ─────────────────────────────────── */
  .bento-cell {
    position: relative;
    border-radius: var(--grid-radius, 6px);
    background: #d9d9d9;
    opacity: var(--cell-opacity);
    overflow: hidden;
  }

  .bento-cell img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .bento-text-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: 2;
  }
</style>
