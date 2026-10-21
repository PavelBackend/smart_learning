import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

type Source = { source: string; license: string; license_url: string; artist: string };

function speakWithBrowser(english: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(english);
  utterance.lang = "en-US";
  utterance.rate = 0.86;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === "en-us") ?? null;
  window.speechSynthesis.speak(utterance);
}

export function PronunciationButton({ wordId, english }: { wordId: string; english: string }) {
  const [source, setSource] = useState<Source | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/pronunciation/${wordId}/source`)
      .then((response) => response.ok ? response.json() as Promise<Source> : null)
      .then((value) => { if (active) setSource(value); })
      .catch(() => { if (active) setSource(null); });
    return () => { active = false; };
  }, [wordId]);
  const play = () => {
    const audio = new Audio(`/api/pronunciation/${wordId}`);
    audio.play().catch(() => speakWithBrowser(english));
  };
  return <span className="pronunciation-control"><button className="pronunciation-button" type="button" onClick={play}
    title="Американское произношение" aria-label={`Прослушать ${english} на американском английском`}>
    <Volume2 size={20} /> <span>US</span>
  </button>{source && <span className="pronunciation-credit">
    <a href={source.source} target="_blank" rel="noreferrer">{source.artist || "Wikimedia Commons"}</a>
    {" · "}<a href={source.license_url || source.source} target="_blank" rel="noreferrer">{source.license}</a>
  </span>}</span>;
}
