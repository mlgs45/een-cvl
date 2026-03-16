import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

// Augmentation minimale : seulement ce qui manque dans lib.dom.d.ts
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

// On définit notre propre interface pour éviter les conflits avec lib.dom.d.ts
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

export type SpeechStatus = 'idle' | 'listening' | 'error' | 'unsupported'

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string) => void
  onError?: (error: string) => void
}

export function useSpeechRecognition({ onResult, onError }: UseSpeechRecognitionOptions) {
  const { i18n } = useTranslation()
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    return () => { recognitionRef.current?.abort() }
  }, [])

  const start = useCallback(() => {
    if (!isSupported) {
      setStatus('unsupported')
      onError?.('Reconnaissance vocale non supportée par ce navigateur.')
      return
    }

    recognitionRef.current?.abort()

    const API = (window.SpeechRecognition ?? window.webkitSpeechRecognition)
    const recognition = new API()

    recognition.lang = i18n.language === 'fr' ? 'fr-FR' : 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setStatus('listening')

    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript
      onResult(transcript)
      setStatus('idle')
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        setStatus('error')
        onError?.(event.error)
        setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('idle')
      }
    }

    recognition.onend = () => {
      setStatus(prev => prev === 'listening' ? 'idle' : prev)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [i18n.language, onResult, onError, isSupported])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setStatus('idle')
  }, [])

  const toggle = useCallback(() => {
    if (status === 'listening') stop()
    else start()
  }, [status, start, stop])

  return { status, isSupported, toggle, stop }
}
