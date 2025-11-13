// runs on the audio rendering thread
class NoiseProcessor extends AudioWorkletProcessor 
{
    constructor() 
    {
        super();

        // noise type: none|white|pink|brown
        this.type = 'none';

        // variables for calculating pink noise (Paul Kellet) 
        this.b0 = 0; this.b1 = 0; this.b2 = 0; this.b3 = 0; this.b4 = 0; this.b5 = 0; this.b6 = 0;
        // Brown state
        this.brown = 0;

        this.port.onmessage = (e) => {
        if (e.data?.type) this.type = e.data.type;
        };
    }

    // note: outputs is a 3D array: outputs[outputIndex][channelIndex][sampleIndex]
    //  and there are typically 128 samples in the audio buffer
    process(inputs, outputs) 
    {
        const MASTER_GAIN = 0.10;  // reduce volume
        const out = outputs[0][0];
        const t = this.type;

        for (let i = 0; i < out.length; i++) 
        {
            if (t === 'none') 
            { 
                out[i] = 0; 
                continue; 
            }

            // random values used to generate noise
            // final out values are in the range [-1, +1];
            // scale down to reduce volume
            const white = Math.random() * 2 - 1;

            if (t === 'white') 
            {
                out[i] = white * 0.4 * MASTER_GAIN; // headroom
            } 
            else if (t === 'pink') 
            {
                // Paul Kellet refined pink filter (good 1/f across band)
                this.b0 = 0.99886 * this.b0 + white * 0.0555179;
                this.b1 = 0.99332 * this.b1 + white * 0.0750759;
                this.b2 = 0.96900 * this.b2 + white * 0.1538520;
                this.b3 = 0.86650 * this.b3 + white * 0.3104856;
                this.b4 = 0.55000 * this.b4 + white * 0.5329522;
                this.b5 = -0.7616 * this.b5 - white * 0.0168980;
                const pink = (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362);
                this.b6 = white * 0.115926;
                out[i] = pink * 0.11 * MASTER_GAIN;
            } 
            else if (t === 'brown')
            {
                // Brownian/integrated white with light damping to prevent drift
                this.brown = (this.brown + 0.02 * white) / 1.02;
                out[i] = this.brown * 3.5 * MASTER_GAIN;
            }
        }
        return true; // keep running
    }
}

registerProcessor('noise-processor', NoiseProcessor);
