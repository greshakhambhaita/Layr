/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				sakura: {
					bg: '#fafbfd',
					cell: '#ffeaf0',
					'cell-hover': '#ffdae4',
					'cell-active': '#ffccd8',
					border: '#4d1624',
					text: '#3d0e1b',
					accent: '#ff4081',
					'accent-glow': 'rgba(255, 64, 129, 0.25)',
					muted: 'rgba(61, 14, 27, 0.55)'
				}
			},
			fontFamily: {
				sans: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
				prata: ['Prata', 'serif'],
				jomolhari: ['Jomolhari', 'serif'],
				arimo: ['Arimo', 'sans-serif'],
				mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
			},
			boxShadow: {
				sm: '4px 4px 0 rgba(77, 22, 36, 0.4)',
				md: '6px 6px 0 rgba(77, 22, 36, 0.35)',
				lg: '10px 10px 0 rgba(77, 22, 36, 0.25)'
			},
			borderRadius: {
				DEFAULT: '4px'
			},
			transitionTimingFunction: {
				spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
				smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
				bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
			}
		}
	},
	plugins: []
};

