//! Synchronisation avec un DAW (V1 — squelette) : MIDI Clock, MTC, Ableton Link.

/// Impulsions MIDI Clock par noire.
pub const MIDI_CLOCK_PPQN: u32 = 24;

/// Intervalle entre deux impulsions MIDI Clock pour un tempo donné.
pub fn clock_interval_micros(bpm: f64) -> u64 {
    (60_000_000.0 / (bpm * MIDI_CLOCK_PPQN as f64)).round() as u64
}

/// Tempo estimé à partir d'intervalles mesurés entre impulsions (moyenne).
pub fn bpm_from_intervals(intervals_micros: &[u64]) -> Option<f64> {
    if intervals_micros.is_empty() {
        return None;
    }
    let mean = intervals_micros.iter().sum::<u64>() as f64 / intervals_micros.len() as f64;
    Some(60_000_000.0 / (mean * MIDI_CLOCK_PPQN as f64))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clock_round_trip() {
        let i = clock_interval_micros(120.0);
        assert_eq!(i, 20_833);
        let bpm = bpm_from_intervals(&[i; 24]).unwrap();
        assert!((bpm - 120.0).abs() < 0.01);
    }
}
