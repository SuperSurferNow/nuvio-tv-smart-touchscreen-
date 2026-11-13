#!/usr/bin/env bash
# One-shot local build + install of the Nuvio TV Installer (Touch) Flatpak.
# Works on Bazzite / any distro with flatpak. Run from the repo root.
set -euo pipefail
ID=io.github.SuperSurferNow.NuvioTVInstallerTouch

flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install -y --user flathub org.flatpak.Builder

if ! command -v npm >/dev/null; then
  command -v brew >/dev/null || { echo "Need node/npm (or Homebrew to install it)."; exit 1; }
  brew install node
fi

npm ci
npm run dist:dir

flatpak run org.flatpak.Builder --user --force-clean --install-deps-from=flathub \
  --install --repo=repo build-dir "flatpak/$ID.yml"
flatpak build-bundle repo NuvioTVInstaller-Touch.flatpak "$ID"

echo
echo "Done. Installed. Run with:  flatpak run $ID"
echo "Bundle saved as: $PWD/NuvioTVInstaller-Touch.flatpak"
