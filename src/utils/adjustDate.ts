export function adjustDate(date: Date, days: number) {
  const adjustedDate = new Date(date); // Cria uma nova instância para não modificar a data original
  adjustedDate.setDate(adjustedDate.getDate() + days);
  return adjustedDate;
}
