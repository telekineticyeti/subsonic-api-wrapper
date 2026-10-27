import utils from 'util';

export default class Utilities {
  /**
   * For easier debugging in node console, use this method to drilldown into structures.
   * @param item Array or Object
   */
  public debug(item: any): void {
    console.debug(utils.inspect(item, false, null, true));
  }

  /**
   * Attempts to convery any given value to an integer. If the conversion
   * fails, a value of -1 is returned.
   * @param value The value to be converted to number.
   * @returns number
   */
  public safeNumber(value: any): number {
    try {
      if (typeof value === 'undefined' || !value || isNaN(value)) {
        return -1;
      }
      const parsedValue = parseInt(value);
      return isNaN(parsedValue) ? -1 : parsedValue;
    } catch (error) {
      return -1;
    }
  }

  /**
   * Converts an optional attribute to a number. Unlike `safeNumber()`, a missing or invalid value
   * gives `undefined` rather than -1.
   * @param value The value to be converted to number.
   * @param float Parse as a float instead of an integer.
   */
  public optionalNumber(value: string | undefined, float = false): number | undefined {
    if (value === undefined || value.trim() === '') return undefined;
    const parsed = float ? parseFloat(value) : parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
}
