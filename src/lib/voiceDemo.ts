// Voice Demo System - Foundation for Phase 2 voice capabilities
// Browser-based speech-to-text and text-to-speech for demo interactions

export interface VoiceSettings {
  tts_enabled: boolean;
  stt_enabled: boolean;
  voice_model: "browser" | "elevenlabs";
  voice_id?: string;
  voice_speed?: number;
  auto_speak?: boolean;
}

export class VoiceDemoManager {
  private static instance: VoiceDemoManager;
  private speechRecognition: any = null;
  private speechSynthesis: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private settings: VoiceSettings;

  private constructor() {
    this.settings = {
      tts_enabled: false,
      stt_enabled: false,
      voice_model: "browser",
      voice_speed: 1.0,
      auto_speak: true
    };
    this.initializeBrowserAPIs();
  }

  static getInstance(): VoiceDemoManager {
    if (!VoiceDemoManager.instance) {
      VoiceDemoManager.instance = new VoiceDemoManager();
    }
    return VoiceDemoManager.instance;
  }

  private initializeBrowserAPIs() {
    // Initialize Speech Recognition (STT)
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = false;
        this.speechRecognition.interimResults = false;
        this.speechRecognition.lang = 'en-US';
        
        this.speechRecognition.onstart = () => {
          this.isListening = true;
        };
        
        this.speechRecognition.onend = () => {
          this.isListening = false;
        };
      }

      // Initialize Speech Synthesis (TTS)
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  updateSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  // Text-to-Speech functionality
  async speak(text: string, options?: { interrupt?: boolean }): Promise<void> {
    if (!this.settings.tts_enabled || !this.speechSynthesis) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Stop any current speech if interrupting
        if (options?.interrupt || this.isSpeaking) {
          this.stopSpeaking();
        }

        if (this.settings.voice_model === "browser") {
          const utterance = new SpeechSynthesisUtterance(text);
          
          // Configure voice settings
          utterance.rate = this.settings.voice_speed || 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
          
          // Try to find a good voice
          const voices = this.speechSynthesis.getVoices();
          const preferredVoice = voices.find(voice => 
            voice.lang.startsWith('en') && 
            (voice.name.includes('Google') || voice.name.includes('Microsoft'))
          ) || voices[0];
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }

          utterance.onstart = () => {
            this.isSpeaking = true;
          };

          utterance.onend = () => {
            this.isSpeaking = false;
            resolve();
          };

          utterance.onerror = (event) => {
            this.isSpeaking = false;
            reject(new Error(`Speech synthesis error: ${event.error}`));
          };

          this.speechSynthesis.speak(utterance);
        } else if (this.settings.voice_model === "elevenlabs") {
          // TODO: Implement ElevenLabs TTS via API
          console.log("ElevenLabs TTS not yet implemented");
          resolve();
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  stopSpeaking() {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  // Speech-to-Text functionality
  async startListening(): Promise<string> {
    if (!this.settings.stt_enabled || !this.speechRecognition || this.isListening) {
      return Promise.reject(new Error("Speech recognition not available or already listening"));
    }

    return new Promise((resolve, reject) => {
      this.speechRecognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        resolve(result.trim());
      };

      this.speechRecognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.speechRecognition.start();
    });
  }

  stopListening() {
    if (this.speechRecognition && this.isListening) {
      this.speechRecognition.stop();
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }

  // Check browser voice capabilities
  static checkVoiceSupport(): { stt: boolean; tts: boolean; } {
    if (typeof window === 'undefined') {
      return { stt: false, tts: false };
    }

    const stt = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
    const tts = !!(window as any).speechSynthesis;

    return { stt, tts };
  }

  // Demo-specific voice responses
  async speakDemoResponse(text: string, autoSpeak: boolean = true): Promise<void> {
    if (!autoSpeak || !this.settings.auto_speak) {
      return;
    }

    // Add natural pauses for better demo flow
    const pausedText = text
      .replace(/\./g, '.')  // Short pause after sentences
      .replace(/,/g, ',')   // Brief pause after commas
      .replace(/OttoServ/g, 'Otto Serv'); // Better pronunciation

    return this.speak(pausedText, { interrupt: true });
  }
}