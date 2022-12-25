import React, { useEffect, useState } from 'react';
import './styles/App.css';
import { ethers } from 'ethers';
import myEpicNft from './utils/MyEpicNft.json';

// Constants
const goerliChainId = '0x5';
const TOTAL_MINT_COUNT = 50;
const OPENSEA_LINK = 'https://testnets.opensea.io/collection/nftsfromprashant';
const CONTRACT_ADDRESS = '0x602DF0A6c695fDE5DADef496aB65f8B763A5B51C';

const App = () => {
	const [currentAccount, setCurrentAccount] = useState('');
	const [testnetAddress, setTestnetAddress] = useState('');
	const [openseaAddress, setOpenseaAddress] = useState('');
	const [correctNetwork, setCorrectNetwork] = useState(false);
	const [loading, setLoading] = useState(false);
	const [mintCount, setMintCount] = useState(0);
	const [tokens, setTokens] = useState([]);

	// runs our function on page load.
	useEffect(() => {
		setLoading(true);
		checkIfWalletIsConnected();
		resetLinks();
		getNFTMintedCount();
		if (!localStorage.getItem('tokenIds')) localStorage.setItem('tokenIds', JSON.stringify([]));
		else setTokens(JSON.parse(localStorage.getItem('tokenIds')));
		setTimeout(() => {
			setLoading(false);
		}, 1000);
	}, []);

	const checkIfWalletIsConnected = async () => {
		setLoading(true);
		// First make sure we have access to window.ethereum
		const { ethereum } = window;

		if (!ethereum) {
			console.log('Make sure you have metamask!');
			return;
		} else {
			console.log('We have the ethereum object', ethereum);
		}
		let chainId = await ethereum.request({ method: 'eth_chainId' });
		console.log('Connected to chain ' + chainId);

		// String, hex code of the chainId of the Goerli test network
		if (chainId !== goerliChainId) {
			setCorrectNetwork(false);
			alert('You are not connected to the Goerli Test Network!');
		} else {
			setCorrectNetwork(true);
		}

		const accounts = await ethereum.request({ method: 'eth_accounts' });

		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log('Found an authorized account:', account);
			setCurrentAccount(account);

			// Setup listener! This is for the case where a user comes to our site
			// and ALREADY had their wallet connected + authorized.
			setupEventListener();
		} else {
			console.log('No authorized account found');
		}
		setLoading(false);
	};

	const resetLinks = () => {
		setOpenseaAddress('');
		setTestnetAddress('');
	};

	const connectWallet = async () => {
		setLoading(true);
		try {
			const { ethereum } = window;

			if (!ethereum) {
				alert('Get MetaMask!');
				return;
			}

			let chainId = await ethereum.request({ method: 'eth_chainId' });
			console.log('Connected to chain ' + chainId);

			// String, hex code of the chainId of the Goerli test network
			const goerliChainId = '0x5';
			if (chainId !== goerliChainId) {
				alert('You are not connected to the Goerli Test Network!');
			}

			const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

			console.log('Connected', accounts[0]);
			setCurrentAccount(accounts[0]);
			setupEventListener();
		} catch {
			console.log('Error connecting');
		}
		setLoading(false);
	};

	// This function will run our contract call and mint our NFT
	const mintNft = async () => {
		setLoading(true);
		resetLinks();
		try {
			const { ethereum } = window;

			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

				console.log('Going to pop wallet now to pay gas...');
				const nftTxn = await connectedContract.makeAnEpicNFT();
				console.log('Mining...please wait.');
				const res = await nftTxn.wait();

				let tokenIds = [];
				tokenIds = JSON.parse(localStorage.getItem('tokenIds'));
				tokenIds.push(mintCount + 1);
				setMintCount(mintCount + 1);
				localStorage.setItem('tokenIds', JSON.stringify(tokenIds));

				setTestnetAddress(`https://goerli.etherscan.io/tx/${nftTxn.hash}`);
			} else {
				console.log("Ethereum object doesn't exist!");
			}
		} catch (error) {
			console.log(error);
		}
		setLoading(false);
	};

	const getNFTMintedCount = async () => {
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const connectContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);
				const count = await connectContract.getTotalNFTMinted();
				console.log('NFT Count ', count);
				setMintCount(Number(count));
			} else {
				console.log('No ethereum object found');
			}
		} catch (error) {
			console.log(error);
		}
	};

	// Setup our listener.
	const setupEventListener = async () => {
		// Most of this looks the same as our function askContractToMintNft
		try {
			const { ethereum } = window;

			if (ethereum) {
				// Same stuff again
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

				// THIS IS THE MAGIC SAUCE.
				// This will essentially "capture" our event when our contract throws it.
				// If you're familiar with webhooks, it's very similar to that!
				connectedContract.on('NewEpicNFTMinted', (from, tokenId) => {
					console.log(from, Number(tokenId));
					alert(
						`Hey there! We've minted your NFT and sent it to your wallet. It may be blank right now. It can take a max of 10 min to show up on OpenSea. Here's the link: https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${Number(
							tokenId
						)}`
					);
					setOpenseaAddress(`https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${tokenId.toNumber()}`);
				});

				ethereum.on('chainChanged', chainId => {
					// console.log("Chain changed to ", chainId);
					chainId === '0x5' && getNFTMintedCount();
					window.location.reload();
				});
			} else {
				console.log("Ethereum object doesn't exist!");
			}
		} catch (error) {
			console.log(error);
		}
	};

	// Render Methods
	const renderNotConnectedContainer = () => (
		<button onClick={connectWallet} className="cta-button connect-wallet-button">
			Connect to Wallet
		</button>
	);

	const renderMint = () => (
		<button onClick={mintNft} className="cta-button connect-wallet-button">
			Mint NFT
		</button>
	);

	return (
		<div className="App">
			{loading && <section className="loading"></section>}
			<div className="container">
				<div className="header-container">
					<p className="header gradient-text">NFT Fair</p>
					<p className="sub-text">Get your unique NFT today.</p>
					{mintCount !== 0 && <p className="sub-text">{`${mintCount}/50 NFT's Minted`}</p>}
					{currentAccount !== '' && <p className="sub-head">{`Connected to Goerli Network: ${correctNetwork ? 'Yes' : 'No'}`}</p>}
					<p className="sub-text">
						{testnetAddress !== '' && <a href={testnetAddress} target="_blank" className="cts-button connect-wallet-button" />}
					</p>
					<p className="sub-text">
						{openseaAddress !== '' && <a href={openseaAddress} target="_blank" className="cts-button connect-wallet-button" />}
					</p>
					<p className="sub-head">{loading ? 'Loading' : ''}</p>
					{currentAccount === '' ? renderNotConnectedContainer() : renderMint()}
				</div>
			</div>

			<div className="container">
				<div className="links-container">
					<div>
						<p className="sub-head">View on Opensea</p>
						<button className="cta-button connect-wallet-button">
							<a href={`https://testnets.opensea.io/assets?search[query]=${CONTRACT_ADDRESS}`} target="_blank">
								Collection
							</a>
						</button>
					</div>

					<div>
						<p className="sub-head">View on Testnet</p>
						<button className="cta-button connect-wallet-button">
							<a href={testnetAddress} target="_blank">
								TestNet
							</a>
						</button>
					</div>

					<div className="links-container">
						<p className="sub-head">Your NFTs</p>
						<div>
							{tokens.map((token, index) => {
								return (
									<button key={index} className="token-button">
										<a href={`https://testnets.opensea.io/assets/goerli/${CONTRACT_ADDRESS}/${token}`} target="_blank">
											{token}
										</a>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>
			<div className="footer-container">
				<h3>
					<a className="footer-text" href="https://PrashantAmoli.github.io/" target="_blank" rel="noreferrer">{`Developed by @PrashantAmoli`}</a>
				</h3>
			</div>
		</div>
	);
};

export default App;
