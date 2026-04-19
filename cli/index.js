#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

const REGISTRY_URL = 'https://oyeaqjroaxbuuydwfjse.supabase.co/rest/v1/grids';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95ZWFxanJvYXhidXV5ZHdmanNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTQxMzMsImV4cCI6MjA5MTkzMDEzM30.n1PthDg1BC4k4b2j5K7aesFe8anSikMr0oEtO1DeXBQ';

const program = new Command();

program
  .name('bento-drop')
  .description('Import bento grids from Layr')
  .version('1.0.0');

program.command('add')
  .description('Add a bento grid by nickname')
  .argument('<nickname>', 'nickname of the grid')
  .action(async (nickname) => {
    const spinner = ora(`Fetching grid ${pc.cyan(nickname)}...`).start();

    try {
      const response = await fetch(`${REGISTRY_URL}?nickname=eq.${nickname}&select=config`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data || data.length === 0) {
        spinner.fail(pc.red(`Grid ${pc.bold(nickname)} not found.`));
        return;
      }

      const config = data[0].config;
      spinner.succeed(pc.green(`Grid ${pc.cyan(nickname)} found!`));

      const componentName = `Bento${nickname.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')}`;
      const fileName = `${componentName}.svelte`;
      const code = generateSvelteComponent(config);

      const outputPath = path.join(process.cwd(), fileName);
      fs.writeFileSync(outputPath, code);

      console.log('\n' + pc.blue('✨ Component created:') + pc.bold(` ./${fileName}`));

      // Auto-save embedded base64 images to ./assets/
      const assetsDir = path.join(process.cwd(), 'assets');
      let savedImages = 0;
      let lostImages = 0;

      for (const cell of config.cells) {
        if (cell.type === 'image' && cell.imageUrl) {
          if (cell.imageUrl.startsWith('data:')) {
            // Extract base64 and save as file
            const matches = cell.imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
            if (matches) {
              const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
              const buffer = Buffer.from(matches[2], 'base64');
              if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
              fs.writeFileSync(path.join(assetsDir, `bento-${cell.id}.${ext}`), buffer);
              savedImages++;
            }
          } else if (cell.imageLost) {
            lostImages++;
          }
        }
      }

      if (savedImages > 0) {
        console.log(pc.green(`\n📁 Saved ${savedImages} image${savedImages > 1 ? 's' : ''} to ./assets/`));
      }
      if (lostImages > 0) {
        console.log(pc.yellow(`\n⚠️  ${lostImages} image${lostImages > 1 ? 's' : ''} could not be recovered (blob URL). Replace manually in ./assets/.`));
      }

      console.log(pc.green('\nEnjoy your bento! 🍱\n'));

    } catch (error) {
      spinner.fail(pc.red('Failed to fetch grid configuration.'));
      console.error(error);
    }
  });

function generateSvelteComponent(config) {
  const { grid, cells, responsive } = config;
  const gap = grid.gap || 12;
  const cellRadius = grid.cellRadius || 8;
  
  // Desktop configuration
  const desktopCols = grid.cols || 6;
  
  // Define cell specific styles for different breakpoints
  const desktopCellStyles = cells.map(cell => {
    return `  .cell-${cell.id} { grid-area: ${cell.r + 1} / ${cell.c + 1} / ${cell.r + 1 + cell.rowSpan} / ${cell.c + 1 + cell.colSpan}; }`;
  }).join('\n');

  let tabletMedia = '';
  if (responsive?.tablet?.cells) {
    const tabletCols = responsive.tablet.cols || 2;
    const tabletCellStyles = responsive.tablet.cells.map(cell => {
      return `    .cell-${cell.id} { grid-area: ${cell.r + 1} / ${cell.c + 1} / ${cell.r + 1 + cell.rowSpan} / ${cell.c + 1 + cell.colSpan}; }`;
    }).join('\n');
    
    tabletMedia = `
  @media (max-width: 1024px) {
    .bento-grid {
      grid-template-columns: repeat(${tabletCols}, 1fr);
      grid-template-rows: none !important;
      grid-auto-rows: 120px;
      height: auto !important;
      aspect-ratio: auto !important;
    }
${tabletCellStyles}
  }`;
  }

  let mobileMedia = '';
  if (responsive?.mobile?.cells) {
    const mobileCols = responsive.mobile.cols || 1;
    const mobileCellStyles = responsive.mobile.cells.map(cell => {
      return `    .cell-${cell.id} { grid-area: ${cell.r + 1} / ${cell.c + 1} / ${cell.r + 1 + cell.rowSpan} / ${cell.c + 1 + cell.colSpan}; }`;
    }).join('\n');
    
    mobileMedia = `
  @media (max-width: 640px) {
    .bento-grid {
      grid-template-columns: repeat(${mobileCols}, 1fr);
      grid-template-rows: none !important;
      grid-auto-rows: 100px;
      height: auto !important;
    }
${mobileCellStyles}
  }`;
  }

  const htmlCells = cells.map(cell => {
    const baseStyle = [
      `background-color: ${cell.hex || '#d9d9d9'}`,
      `opacity: ${cell.opacity ?? 1}`,
      `border-radius: ${cellRadius}px`
    ].join('; ');

    let innerContent = '';
    if (cell.type === 'image' && cell.imageUrl) {
      const fit = cell.imageStyle?.fit || 'cover';
      const scale = cell.imageStyle?.scale || 1;
      const position = cell.imageStyle?.position || 'center';
      innerContent = `\n    <img src="${cell.imageUrl}" alt="" style="width:100%;height:100%;object-fit:${fit};object-position:${position};transform:scale(${scale});position:absolute;inset:0;" />`;
    }

    return `  <div class="cell-${cell.id}" style="${baseStyle}; position:relative; overflow:hidden;">${innerContent}\n  </div>`;
  }).join('\n');

  // Calculate desktop height
  const unitW = (grid.width - gap * (desktopCols - 1)) / desktopCols;
  const desktopHeight = grid.height || Math.round((unitW * grid.rows) + (gap * (grid.rows - 1)));

  return `<div class="bento-grid">
${htmlCells}
</div>

<style>
  .bento-grid {
    display: grid;
    width: 100%;
    max-width: ${grid.width}px;
    height: ${desktopHeight}px;
    margin: 0 auto;
    gap: ${gap}px;
    grid-template-columns: repeat(${desktopCols}, 1fr);
    grid-template-rows: repeat(${grid.rows || 6}, 1fr);
    box-sizing: border-box;
  }

${desktopCellStyles}
${tabletMedia}
${mobileMedia}
</style>`.trim();
}


program.parse();
