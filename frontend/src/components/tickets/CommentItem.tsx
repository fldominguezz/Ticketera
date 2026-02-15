import React from 'react';
import { User, Clock } from 'lucide-react';
import DOMPurify from 'dompurify';

interface Props {
 comment: any;
}

export const CommentItem: React.FC<Props> = ({ comment }) => {
 const sanitizedContent = typeof window !== 'undefined' 
  ? DOMPurify.sanitize(comment.content || '') 
  : comment.content;

 return (
  <div className="comment-item mb-4 animate-fade-in">
   <div className="d-flex justify-content-between align-items-center mb-2">
    <div className="d-flex align-items-center gap-2">
      <div className="avatar-mini">{comment.user?.username?.charAt(0).toUpperCase() || 'U'}</div>
      <span className="small fw-black uppercase tracking-tighter">
       {comment.user?.username || 'Usuario Sistema'}
      </span>
    </div>
    <div className="d-flex align-items-center gap-1 text-muted">
      <Clock size={10} />
      <span className="x-small fw-bold">
       {new Date(comment.created_at).toLocaleString()}
      </span>
    </div>
   </div>
   
   <div className="comment-bubble p-3 bg-surface-muted rounded-lg border border-subtle shadow-sm">
    <div 
     className="comment-content" 
     dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
    />
   </div>

   <style jsx>{`
    .comment-item { 
     border-bottom: 1px solid var(--border-subtle); 
     transition: background-color 0.2s ease;
    }
    .comment-item:hover { background-color: var(--bg-surface-muted); }
    .comment-content { 
     font-size: 13px; 
     line-height: 1.5; 
     color: var(--text-main); 
    }
    .comment-content b, .comment-content strong { 
     color: var(--text-main); 
     font-weight: 800; 
    }
    .comment-content a { 
     color: var(--primary); 
     text-decoration: none; 
     font-weight: bold; 
    }
    .comment-content pre { 
      background: var(--bg-surface); 
      padding: 10px; 
      border-radius: 8px; 
      border: 1px solid var(--border-subtle);
      color: var(--primary); 
      overflow-x: auto; 
    }
    .comment-content code { 
      background: var(--bg-surface); 
      padding: 2px 4px; 
      border-radius: 4px; 
      color: var(--primary); 
    }
   `}</style>
  </div>
 );
};
