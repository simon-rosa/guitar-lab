//! Chaîne d'effets par piste (V1 — premières briques).
//!
//! Les effets traitent des blocs d'échantillons en place, sans allocation,
//! pour pouvoir tourner dans le thread audio. Gain et saturation sont prêts ;
//! simulation d'ampli (convolution d'IR), delay, reverb et chorus restent à faire.

pub trait Effect: Send {
    fn name(&self) -> &'static str;
    fn process(&mut self, block: &mut [f32]);
    fn reset(&mut self) {}
}

/// Gain en décibels.
pub struct Gain {
    factor: f32,
}

impl Gain {
    pub fn from_db(db: f32) -> Self {
        Self { factor: 10f32.powf(db / 20.0) }
    }
}

impl Effect for Gain {
    fn name(&self) -> &'static str {
        "Gain"
    }
    fn process(&mut self, block: &mut [f32]) {
        for s in block {
            *s *= self.factor;
        }
    }
}

/// Saturation douce (tanh) avec pré-gain et mélange sec / traité.
pub struct Overdrive {
    pub drive: f32,
    pub mix: f32,
}

impl Effect for Overdrive {
    fn name(&self) -> &'static str {
        "Overdrive"
    }
    fn process(&mut self, block: &mut [f32]) {
        let norm = self.drive.max(1.0).tanh();
        for s in block {
            let wet = (*s * self.drive).tanh() / norm;
            *s = *s * (1.0 - self.mix) + wet * self.mix;
        }
    }
}

/// Chaîne d'effets dans l'ordre.
#[derive(Default)]
pub struct Chain {
    effects: Vec<Box<dyn Effect>>,
}

impl Chain {
    pub fn push(&mut self, e: Box<dyn Effect>) {
        self.effects.push(e);
    }
    pub fn process(&mut self, block: &mut [f32]) {
        for e in &mut self.effects {
            e.process(block);
        }
    }
    pub fn names(&self) -> Vec<&'static str> {
        self.effects.iter().map(|e| e.name()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gain_doubles_at_6db() {
        let mut g = Gain::from_db(6.0206);
        let mut b = [0.25f32, -0.25];
        g.process(&mut b);
        assert!((b[0] - 0.5).abs() < 1e-3 && (b[1] + 0.5).abs() < 1e-3);
    }

    #[test]
    fn overdrive_stays_bounded() {
        let mut o = Overdrive { drive: 20.0, mix: 1.0 };
        let mut b = [1.0f32, -1.0, 0.5, 0.0];
        o.process(&mut b);
        assert!(b.iter().all(|s| s.abs() <= 1.01));
        assert_eq!(b[3], 0.0);
    }

    #[test]
    fn chain_runs_in_order() {
        let mut c = Chain::default();
        c.push(Box::new(Gain::from_db(0.0)));
        c.push(Box::new(Overdrive { drive: 2.0, mix: 0.5 }));
        assert_eq!(c.names(), vec!["Gain", "Overdrive"]);
        let mut b = [0.3f32];
        c.process(&mut b);
        assert!(b[0] > 0.0 && b[0] < 0.6);
    }
}
