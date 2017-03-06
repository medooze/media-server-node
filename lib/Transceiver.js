/**
 * Track transceiver copies data from an incoming track to an outgoing track and allows stream modifications
 */
class Transceiver
{
	constructor(trasnceiver)
	{
		//Store native trasnceiver
		this.trasnceiver = trasnceiver; 
	}
	
	/**
	 * Select SVC temporatl and spatial layers. Only available for VP9 media.
	 * @param {Number} spatialLayerId The spatial layer id to send to the outgoing stream
	 * @param {Number} temporalLayerId The temporaral layer id to send to the outgoing stream
	 */
	seletLayer(spatialLayerId,temporalLayerId)
	{
		//Call native interface
		this.trasnceiver.SelectLayer(spatialLayerId,temporalLayerId);
	}
};


module.exports = Transceiver;