
import { adaptarTextoArgentino } from './services/gemini';

const testCases = [
    "Hoy Yanina llegó a Saladillo y vio que el costo de la hora de estacionamiento se paga por hoy.",
    "Lluvia en Saladillo hoy, espero que el municipio traiga alivio.",
    "Tú y yo vamos a la calle Belgrano.",
    "Yanina y Yolanda ya están yendo.",
    "Uruguay y Paraguay son países hermanos.",
    "Ayer Yanina ayudó a Yolanda.",
    "Mirá, vení que nos las vamos a pagar allá.",
    "El intendente saludó a los vecinos de Saladillo."
];

console.log("=== TEST DE TRANSFORMACIÓN RIOPLATENSE ARA ===");
testCases.forEach(text => {
    console.log(`Original: ${text}`);
    console.log(`Procesado: ${adaptarTextoArgentino(text)}`);
    console.log("-------------------");
});
