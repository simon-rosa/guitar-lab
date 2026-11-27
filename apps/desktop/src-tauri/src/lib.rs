//! Backend natif de Guitar Lab.
//!
//! Aujourd'hui l'interface (React + alphaTab) fait tout le travail et n'utilise
//! ici que les fichiers (plugins dialog et fs). Ce backend accueillera les
//! fonctions qui exigent du natif : audio basse latence, hébergement VST3/AU,
//! MIDI natif, synchro Ableton Link. Les modules sont en place, avec leurs
//! interfaces et leurs commandes Tauri.

pub mod audio;
pub mod midi;
pub mod plugins;
pub mod sync;

use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    version: &'static str,
    os: &'static str,
    arch: &'static str,
    native_audio: bool,
    plugin_hosting: bool,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION"),
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        native_audio: audio::NATIVE_AUDIO_AVAILABLE,
        plugin_hosting: plugins::HOSTING_AVAILABLE,
    }
}

#[tauri::command]
fn audio_devices() -> Vec<audio::DeviceInfo> {
    audio::list_devices()
}

#[tauri::command]
fn scan_plugins() -> Vec<plugins::PluginInfo> {
    plugins::scan_default_locations()
}

#[tauri::command]
fn midi_ports() -> midi::MidiPorts {
    midi::list_ports()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![app_info, audio_devices, scan_plugins, midi_ports])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Guitar Lab");
}
