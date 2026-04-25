# Prompt Templates

Bundled prompt templates are sourced from:

https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts

License: Apache-2.0. See `awesome-gpt-image-2-prompts.LICENSE`.

The upstream repository is imported with `git subtree` at:

```text
third_party/awesome-gpt-image-2-prompts/
```

Pull upstream updates and sync the frontend JSON/license with:

```bash
npm run update:prompt-templates
```

If the subtree is already up to date and you only want to copy the current snapshot into the frontend bundle:

```bash
bash scripts/update-prompt-templates.sh --sync-only
```

The app uses prompt text and attribution metadata only. It does not depend on upstream media hotlinks.
