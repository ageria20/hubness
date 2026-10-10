// Terminologia per tipo di struttura: la stessa app parla la lingua di ogni cliente.

export const TERMS = {
  palestra: {
    brand: 'Palestra',
    courses: 'Corsi',
    course: 'Corso',
    members: 'Iscritti',
    member: 'Iscritto',
    staff: 'Istruttori',
    staffMember: 'Istruttore',
    subscription: 'Abbonamento',
    bookings: 'Prenotazioni',
    booking: 'Prenotazione',
    calendar: 'Calendario',
    book: 'Prenota',
    plan: 'Piano di allenamento',
    allCourses: 'Tutti i corsi',
    coursesActive: 'Corsi attivi',
  },
  ritmica: {
    brand: 'Ginnastica ritmica',
    courses: 'Corsi',
    course: 'Corso',
    members: 'Allieve',
    member: 'Allieva',
    staff: 'Insegnanti',
    staffMember: 'Insegnante',
    subscription: 'Abbonamento',
    bookings: 'Prenotazioni',
    booking: 'Prenotazione',
    calendar: 'Calendario lezioni',
    book: 'Prenota',
    plan: 'Piano di allenamento',
    allCourses: 'Tutti i corsi',
    coursesActive: 'Corsi attivi',
  },
  medico: {
    brand: 'Studio',
    courses: 'Prestazioni',
    course: 'Prestazione',
    members: 'Pazienti',
    member: 'Paziente',
    staff: 'Professionisti',
    staffMember: 'Professionista',
    subscription: 'Visita',
    bookings: 'Appuntamenti',
    booking: 'Appuntamento',
    calendar: 'Agenda',
    book: 'Prenota visita',
    plan: 'Piano alimentare',
    allCourses: 'Tutte le prestazioni',
    coursesActive: 'Prestazioni attive',
  },
}

export const DEFAULT_TERMS = TERMS.palestra

export function termsFor(type) {
  return TERMS[type] || DEFAULT_TERMS
}

export function applyTheme(type) {
  const root = document.documentElement
  if (type && TERMS[type]) root.setAttribute('data-theme', type)
  else root.removeAttribute('data-theme')
}
