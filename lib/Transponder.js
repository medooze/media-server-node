/**
 * Track transponder copies data from an incoming track to an outgoing track and allows stream modifications
 */
class Transponder
{
	constructor(transponder)
	{
		//Store native trasnceiver
		this.transponder = transponder; 
	}
	
	/**
	 * Select SVC temporatl and spatial layers. Only available for VP9 media.
	 * @param {Number} spatialLayerId The spatial layer id to send to the outgoing stream
	 * @param {Number} temporalLayerId The temporaral layer id to send to the outgoing stream
	 */
	selectLayer(spatialLayerId,temporalLayerId)
	{
		//Call native interface
		this.transponder.SelectLayer(spatialLayerId,temporalLayerId);
	}
};


module.exports = Transponder;