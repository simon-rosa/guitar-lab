//! MIDI natif (V1 — squelette) : entrées et sorties via la crate `midir`.
//! Dans le navigateur, l'interface utilise déjà Web MIDI pour la saisie.

use serde::Serialize;

#[derive(Debug, Default, Serialize)]
pub struct MidiPorts {
    pub inputs: Vec<String>,
    pub outputs: Vec<String>,
}

pub fn list_ports() -> MidiPorts {
    // TODO(V1) : midir::MidiInput::new("Guitar Lab")?.ports() et MidiOutput.
    MidiPorts::default()
}

/// Message de changement de programme (pédaliers Kemper, Helix, Quad Cortex…).
pub fn program_change(channel: u8, program: u8) -> [u8; 2] {
    [0xC0 | (channel.saturating_sub(1) & 0x0F), program & 0x7F]
}

#[cfg(test)]
mod tests {
    #[test]
    fn program_change_bytes() {
        assert_eq!(super::program_change(1, 5), [0xC0, 5]);
        assert_eq!(super::program_change(16, 200), [0xCF, 72]);
    }
}
