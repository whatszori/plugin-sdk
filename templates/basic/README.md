# {{name}}

A [WhatsZori](https://github.com/whatszori/WhatsZori) plugin.

```sh
npm install
npm run dev       # builds into WhatsZori's plugins folder and rebuilds on save
npm run build     # dist/{{id}}/, ready to share
```

Turn it on in WhatsZori under **Settings → Plugins**; it asks for the permissions in
`manifest.json` first. While `npm run dev` runs, WhatsZori reloads the plugin after every save.

To sign a release (users then see who made it, and a version signed by someone else has to be
allowed again):

```sh
npx wz-plugin keygen                       # once; keep the key file private
npx wz-plugin build --key wz-plugin-signing.key
```
