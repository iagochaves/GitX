export function formatObjectData(
  objData: Record<string, unknown>,
): Record<string, unknown> {
  const formattedValues = Object.entries(objData).map(([objKey, objValue]) => [
    objKey,
    String(objValue),
  ]);

  return Object.fromEntries(formattedValues);
}
