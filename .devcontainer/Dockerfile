FROM docker.io/golang:1.17-bullseye

# Note: we do *not* delete the apt cache so subsequent steps (like docker,
# dotfiles) need not pull the cache again. This comes at the cost of a fatter
# container image.
ENV DEBIAN_FRONTEND=noninteractive
RUN apt update && apt upgrade -y
RUN apt install -y \
    clang \
    cmake \
    libssl-dev \
    lldb \
    lsb-release \
    npm \
    sudo \
    time
RUN npm install markdownlint-cli@0.23.1 --global

ARG USER=code
ARG USER_UID=1000
ARG USER_GID=1000
RUN groupadd --gid=$USER_GID $USER \
    && useradd --uid=$USER_UID --gid=$USER_GID -m $USER \
    && echo "$USER ALL=(root) NOPASSWD:ALL" >/etc/sudoers.d/$USER \
    && chmod 0440 /etc/sudoers.d/$USER

# Install a Docker client that uses the host's Docker daemon
ARG USE_MOBY=false
ENV DOCKER_BUILDKIT=1
RUN curl --proto '=https' --tlsv1.3 -vsSfL https://raw.githubusercontent.com/microsoft/vscode-dev-containers/main/script-library/docker-debian.sh \
    | bash -s --  true /var/run/docker-host.sock /var/run/docker.sock "${USER}" "${USE_MOBY}" latest

RUN (echo "LC_ALL=en_US.UTF-8" \
    && echo "LANGUAGE=en_US.UTF-8") >/etc/default/locale

USER $USER
ENV USER=$USER
ENV HOME=/home/$USER
RUN mkdir -p $HOME/bin
ENV PATH=$HOME/bin:$PATH

RUN curl --proto '=https' --tlsv1.3 -vsSfLo $HOME/kubectl "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod 755 $HOME/kubectl
RUN curl --proto '=https' --tlsv1.3 -vsSfL https://raw.githubusercontent.com/rancher/k3d/main/install.sh \
    | USE_SUDO=false K3D_INSTALL_DIR=$HOME/bin bash

RUN curl --proto '=https' --tlsv1.3 -vsSfL https://sh.rustup.rs \
    | sh -s -- -y --default-toolchain 1.56.1 -c rustfmt -c clippy -c rls

RUN mkdir /tmp/cargo-deny && cd /tmp/cargo-deny && \
    curl --proto '=https' --tlsv1.3 -vsSfL https://github.com/EmbarkStudios/cargo-deny/releases/download/0.11.0/cargo-deny-0.11.0-x86_64-unknown-linux-musl.tar.gz | tar zxf - && \
    mv cargo-deny-0.11.0-x86_64-unknown-linux-musl/cargo-deny $HOME/bin && \
    cd .. && rm -rf /tmp/cargo-deny

RUN curl --proto '=https' --tlsv1.3 -vsSfL https://run.linkerd.io/install-edge | sh \
    && ln -s $(readlink ~/.linkerd2/bin/linkerd) ~/bin/linkerd

ENTRYPOINT ["/usr/local/share/docker-init.sh"]
CMD ["sleep", "infinity"]
