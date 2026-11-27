//! Hébergement de plugins VST3 / AU / CLAP (V1 — squelette).
//!
//! Le scan des emplacements standard est opérationnel ; le chargement réel
//! des plugins (vst3-sys / clack-host, fenêtre d'édition, process audio)
//! reste à écrire et se branchera sur `audio::effects::Effect`.

use serde::Serialize;
use std::path::{Path, PathBuf};

pub const HOSTING_AVAILABLE: bool = false;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PluginFormat {
    Vst3,
    Clap,
    Au,
}

#[derive(Debug, Clone, Serialize)]
pub struct PluginInfo {
    pub name: String,
    pub format: PluginFormat,
    pub path: String,
}

/// Dossiers où les systèmes installent les plugins.
pub fn default_locations() -> Vec<(PathBuf, PluginFormat)> {
    let mut out = Vec::new();
    let home = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")).map(PathBuf::from);
    if cfg!(target_os = "windows") {
        let common = std::env::var_os("CommonProgramFiles").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(r"C:\Program Files\Common Files"));
        out.push((common.join("VST3"), PluginFormat::Vst3));
        out.push((common.join("CLAP"), PluginFormat::Clap));
    } else if cfg!(target_os = "macos") {
        out.push((PathBuf::from("/Library/Audio/Plug-Ins/VST3"), PluginFormat::Vst3));
        out.push((PathBuf::from("/Library/Audio/Plug-Ins/CLAP"), PluginFormat::Clap));
        out.push((PathBuf::from("/Library/Audio/Plug-Ins/Components"), PluginFormat::Au));
        if let Some(h) = &home {
            out.push((h.join("Library/Audio/Plug-Ins/VST3"), PluginFormat::Vst3));
            out.push((h.join("Library/Audio/Plug-Ins/Components"), PluginFormat::Au));
        }
    } else {
        out.push((PathBuf::from("/usr/lib/vst3"), PluginFormat::Vst3));
        out.push((PathBuf::from("/usr/local/lib/vst3"), PluginFormat::Vst3));
        out.push((PathBuf::from("/usr/lib/clap"), PluginFormat::Clap));
        if let Some(h) = &home {
            out.push((h.join(".vst3"), PluginFormat::Vst3));
            out.push((h.join(".clap"), PluginFormat::Clap));
        }
    }
    out
}

fn extension_for(format: &PluginFormat) -> &'static str {
    match format {
        PluginFormat::Vst3 => "vst3",
        PluginFormat::Clap => "clap",
        PluginFormat::Au => "component",
    }
}

/// Liste les plugins d'un dossier (récursif, profondeur 3).
pub fn scan_dir(dir: &Path, format: PluginFormat) -> Vec<PluginInfo> {
    fn walk(dir: &Path, format: &PluginFormat, depth: u8, out: &mut Vec<PluginInfo>) {
        let Ok(entries) = std::fs::read_dir(dir) else { return };
        for entry in entries.flatten() {
            let path = entry.path();
            let is_plugin = path.extension().and_then(|e| e.to_str()).is_some_and(|e| e.eq_ignore_ascii_case(extension_for(format)));
            if is_plugin {
                out.push(PluginInfo {
                    name: path.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default(),
                    format: format.clone(),
                    path: path.to_string_lossy().into_owned(),
                });
            } else if path.is_dir() && depth > 0 {
                walk(&path, format, depth - 1, out);
            }
        }
    }
    let mut out = Vec::new();
    walk(dir, &format, 3, &mut out);
    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    out
}

pub fn scan_default_locations() -> Vec<PluginInfo> {
    default_locations().into_iter().flat_map(|(dir, f)| scan_dir(&dir, f)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_vst3_bundles() {
        let root = std::env::temp_dir().join(format!("gl-plugins-{}", std::process::id()));
        std::fs::create_dir_all(root.join("Vendor/Amp Sim.vst3/Contents")).unwrap();
        std::fs::create_dir_all(root.join("Reverb.vst3")).unwrap();
        std::fs::write(root.join("readme.txt"), "x").unwrap();
        let found = scan_dir(&root, PluginFormat::Vst3);
        let names: Vec<_> = found.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["Amp Sim", "Reverb"]);
        std::fs::remove_dir_all(root).ok();
    }

    #[test]
    fn has_default_locations() {
        assert!(!default_locations().is_empty());
    }
}
