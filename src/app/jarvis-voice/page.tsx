import type { Metadata } from "next";
import JarvisVoiceClient from './JarvisVoiceClient';

export const metadata: Metadata = {
  title: "Talk to Jarvis - OttoServ AI Assistant",
  description: "Voice conversation with Jarvis, your OttoServ AI assistant. Get instant help with business automation.",
};

export default function JarvisVoicePage() {
  return <JarvisVoiceClient />;
}