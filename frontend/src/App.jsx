import { Navigate, Route, Routes } from 'react-router'
import Header from './components/Header.jsx'
import Collection from './pages/Collection.jsx'
import Authors from './pages/Authors.jsx'
import BookRegister from './pages/BookRegister.jsx'
import AuthorRegister from './pages/AuthorRegister.jsx'

function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Collection />} />
          <Route path="/autores" element={<Authors />} />
          <Route path="/livros/cadastrar" element={<BookRegister />} />
          <Route path="/autores/cadastrar" element={<AuthorRegister />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

export default App
