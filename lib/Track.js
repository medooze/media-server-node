

class Track
{
	constructor(id,media)
	{
		this.id		= id;
		this.media	= media;
	}
	
	getId() 
	{
		return this.id;
	}
	
	getMedia()
	{
		return this.media;
	}
};

module.exports = Track;


