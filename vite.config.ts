// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { exec } from "child_process";

export default defineConfig({
  plugins: [svelte(),
  {
    name: "run-script-on-change",
    configureServer(server) {
      server.watcher.add("assets/themes/**");

      server.watcher.on("change", (path) => {
        if (path.includes("public/themes.json"))
          return;
          
        console.log(`File changed: ${path}`);        
        exec("node src/build/combine_jsons.js src/assets/themes/ public/themes.json", (err, stdout, stderr) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log(stdout);
        });
      });
    }
  }],
  optimizeDeps: {
    include: ['fabric'],
  },
})

