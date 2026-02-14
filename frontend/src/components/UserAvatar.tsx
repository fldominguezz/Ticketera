import React from 'react';

interface UserAvatarProps {
 user?: {
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
 };
 size?: number;
 fontSize?: string;
 className?: string;
}

const COLORS = [
 '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
 '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
 '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#f39c12',
 '#d35400', '#c0392b', '#7f8c8d'
];

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 40, fontSize = '14px', className = '' }) => {
 if (!user) return null;

 const name = user.first_name && user.last_name 
  ? `${user.first_name} ${user.last_name}` 
  : user.username || 'User';
  
 const initial = name.charAt(0).toUpperCase();
 
 // Generar color determinista basado en el nombre
 const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
 const bgColor = COLORS[charCodeSum % COLORS.length];

 if (user.avatar_url) {
  return (
   <div 
    className={`rounded-circle overflow-hidden shadow-sm ${className}`}
    style={{ 
     width: size, 
     height: size, 
     minWidth: size, 
     minHeight: size, 
     flexShrink: 0 
    }}
   >
    <img 
     src={user.avatar_url} 
     alt={name} 
     className="w-100 h-100 object-fit-cover"
     onError={(e) => {
      // Si la imagen falla al cargar, remover la URL para mostrar el fallback
      (e.target as HTMLImageElement).style.display = 'none';
      (e.target as HTMLImageElement).parentElement!.style.backgroundColor = bgColor;
      (e.target as HTMLImageElement).parentElement!.innerText = initial;
      (e.target as HTMLImageElement).parentElement!.style.display = 'flex';
      (e.target as HTMLImageElement).parentElement!.style.alignItems = 'center';
      (e.target as HTMLImageElement).parentElement!.style.justifyContent = 'center';
      (e.target as HTMLImageElement).parentElement!.style.color = '#fff';
      (e.target as HTMLImageElement).parentElement!.style.fontWeight = 'bold';
     }}
    />
   </div>
  );
 }

 return (
  <div 
   className={`rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm ${className}`}
   style={{ 
    width: size, 
    height: size, 
    minWidth: size, 
    minHeight: size, 
    flexShrink: 0,
    backgroundColor: bgColor,
    fontSize: fontSize,
    textShadow: '0px 1px 2px rgba(0,0,0,0.2)'
   }}
  >
   {initial}
  </div>
 );
};
