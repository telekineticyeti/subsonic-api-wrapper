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
}