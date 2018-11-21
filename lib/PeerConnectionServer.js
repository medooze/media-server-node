const EventEmitter	= require('events').EventEmitter;
const LFSR		= require('lfsr');
const uuidV4		= require('uuid/v4');

const SemanticSDP	= require("semantic-sdp");

const SDPInfo		= SemanticSDP.SDPInfo;
const Setup		= SemanticSDP.Setup;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const SourceGroupInfo	= SemanticSDP.SourceGroupInfo;


/**
 * Manager of remoe peer connecion clients
 */
class PeerConnectionServer
{
	constructor(endpoint,tm,capabilities)
	{
		//Store stuff
		this.count = 0;
		this.endpoint = endpoint;
		this.capabilities = capabilities;
		this.tm = tm;
		
		//Create event emitter
		this.emitter = new EventEmitter();
		
		//Create our namespace
		this.ns = tm.namespace("medooze::pc");
		
		//LIsten for creation events
		this.ns.on("cmd",(cmd)=>{
			//Get command nme
			switch(cmd.name) 
			{
				case "create" :
					//Process the sdp
					var offer = SDPInfo.expand(cmd.data);
					//Create an DTLS ICE transport in that enpoint
					const transport = this.endpoint.createTransport(offer);
					//Set RTP remote properties
					transport.setRemoteProperties(offer);

					//Create local SDP info
					const answer = offer.answer({
						dtls		: transport.getLocalDTLSInfo(),
						ice		: transport.getLocalICEInfo(),
						candidates	: this.endpoint.getLocalCandidates(),
						capabilities	: this.capabilities
					});

					//Set RTP local  properties
					transport.setLocalProperties(answer);
					
					//Get new transport id
					const id = this.count++;
					
					//Create namespace
					const pcns = this.tm.namespace("medooze::pc::"+id);
					
					//LIsten local events
					transport.on("outgoingtrack",(track,stream)=>{
						//Send new event
						pcns.event("addedtrack",{
							streamId: stream ? stream.getId() : "-",
							track	: track.getTrackInfo()
						});
						//Listen for close track
						track.once("stopped",()=>{
							//Send ended event
							pcns.event("removedtrack",{
								streamId:  stream ? stream.getId() : "-",
								trackId	: track.getId()
							});
						});
					}).on("outgoingstream",(stream)=>{
						//For each stream
						for (const track of stream.getTracks())
						{
							//Send new event
							pcns.event("addedtrack",{
								streamId:  stream ? stream.getId() : "-",
								track	: track.getTrackInfo()
							});
							//Listen for close track
							track.once("stopped",()=>{
								//Send ended event
								pcns.event("removedtrack",{
									streamId:  stream ? stream.getId() : "-",
									trackId	: track.getId()
								});
							});
						}
					}).on("stopped",()=>{
						//Send enven
						pcns.event("stopped");
						//Close ns
						pcns.close();

					});
					
					//Listen remote events
					pcns.on("event",(event)=>{
						//Get event data
						const data = event.data;
						//Depending on the event
						switch(event.name) 
						{
							case "addedtrack":
							{
								//Get events
								const streamId = data.streamId;
								const trackInfo = TrackInfo.expand(data.track);
								//Get stream 
								let stream = transport.getIncomingStream(streamId);
								//If we already have it
								if (!stream)
									//Create empty one
									stream = transport.createIncomingStream(new StreamInfo(streamId));
								//Create incoming track
								const track = stream.createTrack(trackInfo);
								break;
							}
							case "removedtrack":
							{
								//Get events
								const streamId = data.streamId;
								const trackId  = data.trackId;
								//Get stream 
								let stream = transport.getIncomingStream(streamId)
								//If we already have it
								if (!stream)
									return;
								//Get track
								const track = stream.getTrack(trackId);
								//If no track
								if (!track)
									return;
								//Stop track
								track.stop();
								//Id stream has no more tracks
								if (!stream.getTracks().length)
									//Stop it too
									stream.stop();
								break;
							}
							case "stop":
								//Stop transport
								this.transport.stop();
						}
					});
					
					//Done
					cmd.accept({
						id		: id,
						dtls		: answer.getDTLS().plain(),
						ice		: answer.getICE().plain(),
						candidates	: this.endpoint.getLocalCandidates(),
						capabilities	: this.capabilities
					});
					
					/**
					* New managed transport has been created by a remote peer connection client
					*
					* @event PeerConnectionServert#transport
					* @argument {Transport} transport An initialized transport
					* @type {object}
					*/
					this.emitter.emit("transport",transport);
					
					break;
				defautl:
					cmd.reject("Command not recognised");
					break;
			}
		});
		
		//Stop when endpoint stop
		this.endpoint.on("stopped",()=>this.stop());
	}
	
	/**
	 * Add event listener
	 * @param {String} event	- Event name 
	 * @param {function} listeener	- Event listener
	 * @returns {PeerConnectionServer} 
	 */
	on() 
	{
		//Delegate event listeners to event emitter
		this.emitter.on.apply(this.emitter, arguments);  
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Add event listener once
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {PeerConnectionServer} 
	 */
	once() 
	{
		//Delegate event listeners to event emitter
		this.emitter.once.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Remove event listener
	 * @param {String} event	- Event name 
	 * @param {function} listener	- Event listener
	 * @returns {PeerConnectionServer} 
	 */
	off() 
	{
		//Delegate event listeners to event emitter
		this.emitter.removeListener.apply(this.emitter, arguments);
		//Return object so it can be chained
		return this;
	}
	
	/**
	 * Stop the peerconnection server, will not stop the transport created by it
	 */
	stop()
	{
		//Close ns
		this.ns.close();
		//Null
		this.emitter = null;
		this.ns = null;
		this.endpoint = null;
	}
}

module.exports = PeerConnectionServer;
