# T109 Migration Inventory

## Source

- Working tree: `/Users/iiwish/self/g2touch`
- Source HEAD: `af3aec4f5d2b74453a56cb413777a1dd93b5daf6`
- Remote main: `af3aec4f5d2b74453a56cb413777a1dd93b5daf6`
- Remote dev: `59739ed6ba5695b8edf54c2989d19105295a1c6c`
- Source status hash after migration reads: `25a493c80333d35db75eeb856ff0e05c56b285b573b1ce09d4c307748565c5fd`

## Safety Copy

- Bare mirror: `/Users/iiwish/self/g2touch-legacy.git`
- `git fsck --full`: exit 0
- Mirror heads match remote `main` and `dev`.

## Target

- Working tree: `/Users/iiwish/self/tellplot`
- Git history: independent repository initialized with `main` and no inherited commits
- Initial copy audit: `rsync -ani --delete` returned no differences after excluding `.git`, dependencies, build, coverage and browser-result directories
- Existing T101-T108 evidence comparison: `diff -qr` returned no differences before T109 evidence was added
- Repository input: 195 non-ignored files after migration artifacts; no file exceeds 5 MiB

## Remote Boundary

The old GitHub repository was only read through `ls-remote` and mirror clone. It was not renamed, archived, deleted, pushed or otherwise modified during T109.
