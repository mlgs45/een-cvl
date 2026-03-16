import { useCallback } from 'react'
import { useSpeechRecognition, SpeechStatus } from '../hooks/useSpeechRecognition'

interface VoiceInputButtonProps {
  onResult: (text: string) => void
  /** Si un autre champ est en cours d'écoute, on désactive ce bouton */
  activeField: string | null
  fieldKey: string
  onActiveChange: (key: string | null) => void
}

export default function VoiceInputButton({
  onResult,
  activeField,
  fieldKey,
  onActiveChange,
}: VoiceInputButtonProps) {
  const handleResult = useCallback((transcript: string) => {
    onResult(transcript)
    onActiveChange(null)
  }, [onResult, onActiveChange])

  const { status, isSupported, toggle } = useSpeechRecognition({
    onResult: handleResult,
    onError: () => onActiveChange(null),
  })

  if (!isSupported) return null

  const isListening = activeField === fieldKey && status === 'listening'
  const isOtherActive = activeField !== null && activeField !== fieldKey

  function handleClick() {
    if (isOtherActive) return
    if (isListening) {
      onActiveChange(null)
    } else {
      onActiveChange(fieldKey)
    }
    toggle()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isOtherActive}
      title={isListening ? 'Arrêter l\'écoute' : 'Dicter ce champ'}
      className={`
        shrink-0 p-1.5 rounded-md transition-all
        ${isListening
          ? 'bg-red-50 text-red-500 ring-2 ring-red-300 animate-pulse'
          : isOtherActive
            ? 'text-gray-200 cursor-not-allowed'
            : 'text-gray-400 hover:text-primary hover:bg-primary-50'
        }
      `}
    >
      {isListening ? (
        // Icône onde sonore (écoute active)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor" fillOpacity="0.2"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      ) : (
        // Icône micro repos
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      )}
    </button>
  )
}
