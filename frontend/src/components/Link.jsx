import { Link as RouterLink } from 'react-router-dom'

const Link = ({ to, children, className, ...props }) => {
  // Handle missing or invalid 'to' prop
  if (!to || typeof to !== 'string') {
    console.error('Link component: Invalid or missing "to" prop', { to });
    return (
      <span className={className} {...props}>
        {children}
      </span>
    )
  }
  
  // If it's an external link or anchor, use regular <a> tag
  if (to.startsWith('http') || to.startsWith('#')) {
    return (
      <a href={to} className={className} {...props}>
        {children}
      </a>
    )
  }
  
  // For internal links, use React Router Link
  return (
    <RouterLink to={to} className={className} {...props}>
      {children}
    </RouterLink>
  )
}

export default Link