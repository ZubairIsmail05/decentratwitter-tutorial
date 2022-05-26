const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Decentratwitter", function () {

  let decentratwitter
  let deployer, user1, user2, users
  let URI = "SampleURI"
  let postHash = "SampleHash"

  beforeEach(async () => {
    // Get signers from development accounts 
    [deployer, user1, user2, ...users] = await ethers.getSigners();
    // We get the contract factory to deploy the contract
    const DecentratwitterFactory = await ethers.getContractFactory("Decentratwitter");
    // Deploy contract
    decentratwitter = await DecentratwitterFactory.deploy();
    // user1 mints an nfts 
    await decentratwitter.connect(user1).mint(URI)
  })

  describe('Deployment', async () => {
    it("Should track name and symbol", async function () {
      const nftName = "Decentratwitter"
      const nftSymbol = "DAPP"
      expect(await decentratwitter.name()).to.equal(nftName);
      expect(await decentratwitter.symbol()).to.equal(nftSymbol);
    });
  })

  describe('Minting NFT', async () => {
    it("Should track each minted NFT", async function () {
      expect(await decentratwitter.tokenCount()).to.equal(1);
      expect(await decentratwitter.balanceOf(user1.address)).to.equal(1);
      expect(await decentratwitter.tokenURI(1)).to.equal(URI);

      // user2 mints nft
      await decentratwitter.connect(user2).mint(URI)
      expect(await decentratwitter.tokenCount()).to.equal(2);
      expect(await decentratwitter.balanceOf(user2.address)).to.equal(1);
      expect(await decentratwitter.tokenURI(2)).to.equal(URI);

    })
  })

  describe('Setting profiles', async () => {
    it("Should allow users to set their profiles from NFTs they own", async function () {
      // user1 mints another NFT
      await decentratwitter.connect(user1).mint(URI)

      // Profile defaults to last user minted NFT
      expect(await decentratwitter.profiles(user1.address)).to.equal(2);

      // user 1 sets profile to first minted NFT
      await decentratwitter.connect(user1).setProfile(1)
      expect(await decentratwitter.profiles(user1.address)).to.equal(1);

      // FAIL CASE
      // user 2 tries to set their profile to NFT #2 owned bt user1
      await expect(decentratwitter.connect(user2).setProfile(2)).to.be.revertedWith("You must own the NFT you want to select as your profile");
    });
  });

  describe('Uploading posts', async () => {
    it("Should track posts uploaded only by users who own an NFT", async function () {
      // user1 uploads post
      await expect(decentratwitter.connect(user1).uploadPost(postHash)).to.emit(decentratwitter, "PostCreated").withArgs(1, postHash, 0, user1.address)
      const postCount = await decentratwitter.postCount();
      expect(postCount).to.equal(1);
      // Check Post struct
      const post = await decentratwitter.posts(postCount);
      expect(post.id).to.equal(1);
      expect(post.hash).to.equal(postHash);
      expect(post.tipAmount).to.equal(0);
      expect(post.author).to.equal(user1.address)
      // FAIL CASE #1 --- user2 tries to upload post without owning NFT
      await expect(decentratwitter.connect(user2).uploadPost(postHash)).to.be.revertedWith("Must own a decentratwitter nft to post");
      // FAIL CASE #2 --- user1 tries to upload post with empty post hash
      await expect(decentratwitter.connect(user1).uploadPost("")).to.be.revertedWith("Cannot pass an empty hash");
    });
  });

  describe('Tipping posts', async () => {
    it("Should allow users to tip posts and track each post's tip amount", async function () {
      // user1 uploads a post
      await decentratwitter.connect(user1).uploadPost(postHash)
      // Track user1 balance before their post gets tipped
      const initAuthorBalance = await ethers.provider.getBalance(user1.address);
      // Set tip amount to 1 ether
      const tipAmount = ethers.utils.parseEther("1");
      // user2 tips user1's post
      await expect(decentratwitter.connect(user2).tipPostOwner(1, { value: tipAmount })).to.emit(decentratwitter, "PostTipped").withArgs(1, postHash, tipAmount, user1.address)
      // Check tipAmount has been updated from struct
      const post = await decentratwitter.posts(1)
      expect(post.tipAmount).to.equal(tipAmount)
      // Check that user1 received funds
      const finalAuthorBalance = await ethers.provider.getBalance(user1.address);
      expect(finalAuthorBalance).to.equal(initAuthorBalance.add(tipAmount));
      // FAIL CASE #1 --- user2 tries to tip post that does not exist
      await expect(decentratwitter.connect(user2).tipPostOwner(2)).to.be.revertedWith("Invalid post id");
      // FAIL CASE #2 --- user1 tries to tip their own post
      await expect(decentratwitter.connect(user1).tipPostOwner(1)).to.be.revertedWith("Cannot tip your own post");
    });
  });

  describe('Getter functions', function () {
    let ownedByUser1 = [1, 2];
    let ownedByUser2 = [3]
    beforeEach(async function () {
      // user1 makes a post
      await decentratwitter.connect(user1).uploadPost(postHash)
      // user1 mints another NFT
      await decentratwitter.connect(user1).mint(URI)
      // user2 mints an NFT
      await decentratwitter.connect(user2).mint(URI)
      // user2 makes a post
      await decentratwitter.connect(user2).uploadPost(postHash)
    })

    it("getAllPosts should fetch all the posts", async function () {
      const allPosts = await decentratwitter.getAllPosts();
      // Check that length is correct
      expect(allPosts.length).to.equal(2)
    });

    it("getMyNfts should fetch all nfts the user owns", async function () {
      const user1Nfts = await decentratwitter.connect(user1).getMyNfts();
      expect(user1Nfts.length).to.equal(2)
      const user2Nfts = await decentratwitter.connect(user2).getMyNfts();
      expect(user2Nfts.length).to.equal(1)
    });
  });




})


