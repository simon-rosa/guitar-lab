//! Moteur audio natif (V1 — squelette).
//!
//! Objectif : latence < 10 ms via ASIO (Windows), CoreAudio (macOS), ALSA/JACK
//! (Linux), avec la crate `cpal`. Le moteur recevra le flux MIDI du séquenceur,
//! le synthétisera (SoundFont puis banques échantillonnées) et passera chaque
//! piste dans sa chaîne d'effets (`effects`).

pub mod effects;

use serde::Serialize;

/// Passera à `true` quand le moteur cpal sera branché.
pub const NATIVE_AUDIO_AVAILABLE: bool = false;

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub host: String,
    pub sample_rates: Vec<u32>,
    pub min_buffer: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StreamConfig {
    pub sample_rate: u32,
    pub buffer_size: u32,
    pub channels: u16,
}

impl Default for StreamConfig {
    fn default() -> Self {
        Self { sample_rate: 48_000, buffer_size: 128, channels: 2 }
    }
}

impl StreamConfig {
    /// Latence d'un tampon, en millisecondes.
    pub fn latency_ms(&self) -> f32 {
        self.buffer_size as f32 * 1000.0 / self.sample_rate as f32
    }
}

/// Contrat du moteur audio : le rendu se fait par blocs dans le thread temps réel.
pub trait AudioEngine: Send {
    fn start(&mut self, config: StreamConfig) -> Result<(), AudioError>;
    fn stop(&mut self);
    fn is_running(&self) -> bool;
}

#[derive(Debug, thiserror::Error)]
pub enum AudioError {
    #[error("aucun périphérique audio disponible")]
    NoDevice,
    #[error("moteur audio natif pas encore implémenté")]
    NotImplemented,
}

/// Moteur vide utilisé tant que cpal n'est pas branché.
#[derive(Default)]
pub struct NullEngine {
    running: bool,
}

impl AudioEngine for NullEngine {
    fn start(&mut self, _config: StreamConfig) -> Result<(), AudioError> {
        Err(AudioError::NotImplemented)
    }
    fn stop(&mut self) {
        self.running = false;
    }
    fn is_running(&self) -> bool {
        self.running
    }
}

pub fn list_devices() -> Vec<DeviceInfo> {
    // TODO(V1) : cpal::available_hosts() puis devices() de chaque hôte.
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn latency_of_default_config() {
        let c = StreamConfig::default();
        assert!((c.latency_ms() - 2.666).abs() < 0.01);
    }

    #[test]
    fn null_engine_refuses_to_start() {
        let mut e = NullEngine::default();
        assert!(e.start(StreamConfig::default()).is_err());
        assert!(!e.is_running());
    }
}
