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
  const { grid, cells } = config;

  const cols = grid.cols || 6;
  const rows = grid.rows || 6;
  const width = grid.width || 600;
  const gap = grid.gap || 12;
  const cellRadius = grid.cellRadius || 8;

  // Calculate height using Layr's internal formula if not provided
  const unitW = (width - gap * (cols - 1)) / cols;
  const height = grid.height || Math.round((unitW * rows) + (gap * (rows - 1)));

  const cellBlocks = cells.map(cell => {
    const style = [
      `grid-area: ${cell.r + 1} / ${cell.c + 1} / ${cell.r + 1 + cell.rowSpan} / ${cell.c + 1 + cell.colSpan}`,
      `background-color: ${cell.hex || '#d9d9d9'}`,
      `opacity: ${cell.opacity ?? 1}`,
      `border-radius: ${cellRadius}px`,
      `overflow: hidden`,
      `position: relative`
    ].join('; ');

    let innerContent = '';

    if (cell.type === 'image' && cell.imageUrl) {
      const fit = cell.imageStyle?.fit || 'cover';
      const scale = cell.imageStyle?.scale || 1;
      innerContent = `\n  <img src="${cell.imageUrl}" alt="" style="width:100%;height:100%;object-fit:${fit};transform:scale(${scale});position:absolute;inset:0;" />`;
    }

    return `<div style="${style}">${innerContent}\n</div>`;
  }).join('\n\n');

  return `<div
  class="bento-grid"
  style="display:grid;width:${width}px;height:${height}px;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);gap:${gap}px;box-sizing:border-box;"
>
${cellBlocks}
</div>

<style>
  .bento-grid {
    max-width: 100%;
    margin: 0 auto;
  }
</style>
`.trim();
}

program.parse();
