import React from 'react'

interface MarkdownTextProps {
  content: string
  className?: string
}

/**
 * Simple markdown renderer for chat messages
 * Supports:
 * - **bold text**
 * - Bullet points (• or -)
 * - Numbered lists
 * - Line breaks
 */
export default function MarkdownText({ content, className = '' }: MarkdownTextProps) {
  const formatText = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    let key = 0

    // Split by lines to handle lists and paragraphs
    const lines = text.split('\n')
    
    lines.forEach((line, lineIndex) => {
      if (line.trim() === '') {
        // Empty line - add spacing
        if (lineIndex < lines.length - 1) {
          parts.push(<br key={`br-${key++}`} />)
        }
        return
      }

      // Check if it's a bullet point
      const bulletMatch = line.match(/^[\s]*[•\-\*]\s+(.+)$/)
      if (bulletMatch) {
        parts.push(
          <div key={`bullet-${key++}`} className="flex items-start gap-2 my-1">
            <span className="text-green-800 font-bold mt-1">•</span>
            <span>{formatInlineMarkdown(bulletMatch[1], key++)}</span>
          </div>
        )
        return
      }

      // Check if it's a numbered list item
      const numberedMatch = line.match(/^[\s]*\d+[\.\)]\s+(.+)$/)
      if (numberedMatch) {
        parts.push(
          <div key={`numbered-${key++}`} className="flex items-start gap-2 my-1">
            <span className="text-green-800 font-semibold mt-1">{numberedMatch[0].match(/\d+/)?.[0]}.</span>
            <span>{formatInlineMarkdown(numberedMatch[1], key++)}</span>
          </div>
        )
        return
      }

      // Regular paragraph with inline formatting
      if (line.trim()) {
        parts.push(
          <div key={`para-${key++}`} className="my-1">
            {formatInlineMarkdown(line, key++)}
          </div>
        )
      }
    })

    return parts.length > 0 ? parts : [<span key="empty">{text}</span>]
  }

  const formatInlineMarkdown = (text: string, baseKey: number): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    let key = baseKey

    // Match **bold** text
    const boldRegex = /\*\*(.+?)\*\*/g
    let match
    let lastIndex = 0

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the bold
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</span>)
      }

      // Add bold text
      parts.push(
        <strong key={`bold-${key++}`} className="font-semibold text-gray-900">
          {match[1]}
        </strong>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex)}</span>)
    }

    return parts.length > 0 ? parts : [<span key="plain">{text}</span>]
  }

  return (
    <div className={className}>
      {formatText(content)}
    </div>
  )
}

