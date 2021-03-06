## To get started

1. clone the repo and make sure it's a sibling to the `codestream-lsp-agent` and `codestream-components` repos
2. Build [codestream-components](https://github.com/TeamCodeStream/codestream-components/blob/develop/README.md)
3. Build [codestream-lsp-agent](https://github.com/TeamCodeStream/codestream-lsp-agent/blob/develop/README.md)
4. `cd` into the repo
5. run `apm link --dev`, which tells atom to use this directory as the package source for atom windows running in dev mode.
6. open atom in dev mode (`atom --dev path/to/project`) to debug the extension

## For development

1. install the prettier-atom package in atom
2. in the settings for prettier-atom, enable the following settings

- 'Format Files on Save'
- 'Only format if Prettier is found in your project's dependencies'

## NPM scripts

- `build`: builds both the extension and webview
- `watch`: watches both the extension and webview
- `extension:build`
- `extension:watch`
- `webview:build`
- `webview:watch`. webview changes don't require a reload of the debugging window. just kill and reopen the codestream view
- `bundle`: create production versions of everything
- `pack [currently released package version]`: copy everything into the public repo to be published

**Pro-tip** `apm install teamcodestream/codestream-atom-toolbar` for a toolbar with buttons to easily change environments, reload the window, and signout
