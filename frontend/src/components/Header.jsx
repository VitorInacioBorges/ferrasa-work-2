import { NavLink } from 'react-router'

const Header = () => {
  return (
    <header className="site-header">
      <nav aria-label="Navegação principal">
        <NavLink to="/" end>Acervo</NavLink>
        <NavLink to="/autores" end>Autores</NavLink>
      </nav>
    </header>
  )
}

export default Header
